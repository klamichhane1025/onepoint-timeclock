import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import bcrypt from "npm:bcryptjs@2.4.3";
import { DateTime } from "npm:luxon@3.5.0";

const ALLOWED = new Set(["https://timeclock.onepointsystems.io", "https://cashier.onepointsystems.io"]);
function cors(req: Request) {
  const origin = req.headers.get("origin") || "";
  return {
    "Access-Control-Allow-Origin": ALLOWED.has(origin) ? origin : "https://timeclock.onepointsystems.io",
    "Vary": "Origin",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}
const json = (req: Request, body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors(req), "Content-Type": "application/json", "Cache-Control": "no-store" } });

async function sha256Hex(input: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
const timePart = (value: string | null) => (value || "").slice(0, 8);

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) });
  if (req.method !== "POST") return json(req, { error: "Method not allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(url, service, { auth: { persistSession: false } });

  let body: any;
  try { body = await req.json(); } catch { return json(req, { error: "Invalid request" }, 400); }
  if (String(body.action || "") !== "punch") return json(req, { error: "Unsupported action" }, 400);

  try {
    const deviceToken = String(body.device_token || "");
    if (deviceToken.length < 32) return json(req, { error: "Store onboard needed." }, 401);

    const tokenHash = await sha256Hex(deviceToken);
    const { data: device, error: deviceError } = await admin
      .from("kiosk_devices")
      .select("id,organization_id,store_id,active,stores(id,name,store_code,timezone,payroll_logic,active)")
      .eq("token_hash", tokenHash)
      .eq("active", true)
      .maybeSingle();
    if (deviceError || !device) return json(req, { error: "Store onboard needed." }, 401);

    const store: any = (device as any).stores;
    if (!store?.active) return json(req, { error: "Store onboard needed." }, 403);

    const { data: organization } = await admin
      .from("organizations")
      .select("status,timeclock_enabled,timeclock_access_start,timeclock_access_end")
      .eq("id", device.organization_id)
      .maybeSingle();
    if (!organization) return json(req, { error: "Business not found." }, 404);

    const nowMs = Date.now();
    const accessStart = organization.timeclock_access_start ? new Date(organization.timeclock_access_start).getTime() : null;
    const accessEnd = organization.timeclock_access_end ? new Date(organization.timeclock_access_end).getTime() : null;
    if (
      organization.status === "archived" || organization.timeclock_enabled === false ||
      (accessStart && nowMs < accessStart) || (accessEnd && nowMs > accessEnd)
    ) {
      return json(req, { error: organization.status === "archived" || organization.timeclock_enabled === false ? "TIME CLOCK DISABLED" : "TIME CLOCK OUTSIDE ACCESS WINDOW" }, 403);
    }

    const employeeNumber = String(body.employee_number || "").trim();
    const pin = String(body.pin || "").trim();
    if (!/^\d+$/.test(employeeNumber) || !/^\d{4,8}$/.test(pin)) return json(req, { error: "Enter a valid Employee ID and PIN." }, 400);

    const employeeSelect = "id,organization_id,employee_number,name,pin_hash,base_pay_type,base_pay_rate,status";
    const candidates = new Map<string, any>();
    const { data: localRows, error: localError } = await admin.from("employees").select(employeeSelect).eq("organization_id", device.organization_id).eq("employee_number", employeeNumber).eq("status", "active");
    if (localError) throw localError;
    for (const row of localRows || []) candidates.set(row.id, row);

    const { data: sharedLinks, error: sharedLinkError } = await admin.from("employee_org_shares").select("employee_id").eq("shared_organization_id", device.organization_id).eq("active", true);
    if (sharedLinkError) throw sharedLinkError;
    const sharedIds = [...new Set((sharedLinks || []).map((row: any) => row.employee_id))];
    if (sharedIds.length) {
      const { data: sharedRows, error: sharedError } = await admin.from("employees").select(employeeSelect).in("id", sharedIds).eq("employee_number", employeeNumber).eq("status", "active");
      if (sharedError) throw sharedError;
      for (const row of sharedRows || []) candidates.set(row.id, row);
    }

    const matchedEmployees: any[] = [];
    for (const candidate of candidates.values()) if (candidate.pin_hash && await bcrypt.compare(pin, candidate.pin_hash)) matchedEmployees.push(candidate);
    if (!matchedEmployees.length) return json(req, { error: "Employee ID or PIN is incorrect." }, 401);
    if (matchedEmployees.length > 1) return json(req, { error: "This Employee ID and PIN combination is duplicated across shared Owners. Ask an administrator to change one employee PIN." }, 409);
    const employee = matchedEmployees[0];

    const now = new Date().toISOString();
    const nowUtc = DateTime.fromISO(now, { zone: "utc" });

    async function operatingWindow(iso: string) {
      const zone = store.timezone || "America/Chicago";
      const local = DateTime.fromISO(iso, { zone: "utc" }).setZone(zone);
      const today = local.startOf("day");
      const previous = today.minus({ days: 1 });
      const weekdays = [today.weekday % 7, previous.weekday % 7];
      const { data: rows } = await admin.from("store_hours").select("weekday,open_time,close_time,closed").eq("store_id", device.store_id).in("weekday", weekdays);
      const byDay = (weekday: number) => (rows || []).find((row: any) => row.weekday === weekday);
      const build = (day: DateTime, row: any) => {
        if (!row || row.closed || !row.open_time || !row.close_time) return null;
        const open = DateTime.fromISO(`${day.toISODate()}T${timePart(row.open_time)}`, { zone });
        let close = DateTime.fromISO(`${day.toISODate()}T${timePart(row.close_time)}`, { zone });
        if (close <= open) close = close.plus({ days: 1 });
        return { open, close };
      };
      const previousWindow = build(previous, byDay(previous.weekday % 7));
      if (previousWindow && local < previousWindow.close && local >= previousWindow.open) return previousWindow;
      return build(today, byDay(today.weekday % 7));
    }

    let { data: openEntry, error: openError } = await admin
      .from("time_entries").select("*")
      .eq("employee_id", employee.id).eq("is_void", false).eq("missed_clock_out", false).is("actual_clock_out", null)
      .order("actual_clock_in", { ascending: false }).limit(1).maybeSingle();
    if (openError) throw openError;

    const requestedAction = body.requested_action === "clock_in" || body.requested_action === "clock_out" ? body.requested_action : null;
    if (!requestedAction) return json(req, { error: "Choose Clock In or Clock Out." }, 400);

    if (requestedAction === "clock_in" && openEntry && openEntry.scheduled_close_at) {
      const close = DateTime.fromISO(openEntry.scheduled_close_at, { zone: "utc" });
      const graceEnds = close.plus({ hours: 1 });
      if (graceEnds <= nowUtc) {
        const payableIn = DateTime.fromISO(openEntry.payable_clock_in || openEntry.actual_clock_in, { zone: "utc" });
        const payableOut = (close < payableIn ? payableIn : close).toISO();
        const { error: finalizeError } = await admin.from("time_entries").update({
          payable_clock_out: payableOut,
          missed_clock_out: true,
          close_time_adjusted: true,
          system_closed_at: now,
        }).eq("id", openEntry.id);
        if (finalizeError) throw finalizeError;
        await admin.from("audit_logs").insert({
          organization_id: openEntry.organization_id,
          actor_user_id: null,
          action: "missed_clock_out_finalized",
          entity_type: "time_entry",
          entity_id: openEntry.id,
          details: { scheduled_close_at: openEntry.scheduled_close_at, grace_minutes: 60, trigger: "next_clock_in_shared_employee" },
        });
        openEntry = null;
      }
    }

    if (requestedAction === "clock_out" && !openEntry) {
      const since = new Date(Date.now() - 36 * 3600e3).toISOString();
      const { data: missed } = await admin.from("time_entries").select("*")
        .eq("employee_id", employee.id).eq("store_id", device.store_id).eq("is_void", false).eq("missed_clock_out", true)
        .is("actual_clock_out", null).gte("actual_clock_in", since).order("actual_clock_in", { ascending: false }).limit(1).maybeSingle();
      if (missed) {
        const { data: entry, error: updateError } = await admin.from("time_entries").update({ actual_clock_out: now, close_time_adjusted: true }).eq("id", missed.id).select("id,actual_clock_out,payable_clock_out").single();
        if (updateError) throw updateError;
        await admin.from("audit_logs").insert({ organization_id: missed.organization_id, actor_user_id: null, action: "employee_late_clock_out_after_system_close", entity_type: "time_entry", entity_id: entry.id, details: { employee_id: employee.id, store_id: device.store_id, kiosk_device_id: device.id, shared_employee: employee.organization_id !== device.organization_id } });
        return json(req, { ok: true, action: "clock_out", employee_name: employee.name, timestamp: entry.actual_clock_out, warning: "Clock-out was after the scheduled closing time. Payable time remains capped at store closing." });
      }
      return json(req, { error: "NOT CLOCKED IN" }, 409);
    }

    if (requestedAction === "clock_in" && openEntry) {
      if (openEntry.store_id !== device.store_id && openEntry.scheduled_close_at) {
        const close = DateTime.fromISO(openEntry.scheduled_close_at, { zone: "utc" });
        const graceEnds = close.plus({ hours: 1 });
        if (nowUtc < graceEnds && nowUtc >= close) {
          return json(req, { error: "Your previous shift is still in the 60-minute closing grace period. Clock out at the original location or wait until the grace period ends." }, 409);
        }
      }
      return json(req, { error: "ALREADY CLOCKED IN", can_clock_out: true, clocked_in_at: openEntry.actual_clock_in }, 409);
    }
    if (openEntry && openEntry.store_id !== device.store_id) return json(req, { error: "You are currently clocked in at a different location. Use that location or ask a manager to correct the timesheet." }, 409);

    if (!openEntry) {
      let payType = employee.base_pay_type;
      let payRate = employee.base_pay_rate;
      let jobId = null;
      const { data: storePay } = await admin.from("employee_store_pay_rates").select("pay_type,pay_rate").eq("employee_id", employee.id).eq("store_id", device.store_id).maybeSingle();
      if (storePay?.pay_type && storePay.pay_rate != null) { payType = storePay.pay_type; payRate = storePay.pay_rate; }
      else if (employee.organization_id === device.organization_id) {
        const { data: jobAssignment } = await admin.from("employee_job_assignments").select("job_code_id,job_codes(id,pay_type,pay_rate,active)").eq("organization_id", device.organization_id).eq("employee_id", employee.id).limit(1).maybeSingle();
        const job: any = (jobAssignment as any)?.job_codes;
        if (job) { jobId = job.id; if (job.pay_type && job.pay_rate != null) { payType = job.pay_type; payRate = job.pay_rate; } }
      }

      const payableIn = now;
      let warning = null;
      let scheduledOpen: string | null = null;
      let scheduledClose: string | null = null;
      const window = await operatingWindow(now);
      if (window) {
        scheduledOpen = window.open.toUTC().toISO();
        scheduledClose = window.close.toUTC().toISO();
        if (store.payroll_logic === "dfw" && nowUtc > window.close.toUTC()) return json(req, { error: "STORE CLOSED" }, 409);
      } else if (store.payroll_logic === "dfw") warning = "Operating hours are not configured for this business day. Payable time will require manager review.";

      const { data: entry, error: insertError } = await admin.from("time_entries").insert({
        organization_id: device.organization_id, employee_id: employee.id, store_id: device.store_id, job_code_id: jobId,
        actual_clock_in: now, payable_clock_in: payableIn, pay_type_snapshot: payType, pay_rate_snapshot: payRate,
        payroll_logic_snapshot: store.payroll_logic, scheduled_open_at: scheduledOpen, scheduled_close_at: scheduledClose, is_void: false,
      }).select("id,actual_clock_in,payable_clock_in").single();
      if (insertError) throw insertError;
      await admin.from("audit_logs").insert({ organization_id: device.organization_id, actor_user_id: null, action: "employee_clock_in", entity_type: "time_entry", entity_id: entry.id, details: { employee_id: employee.id, employee_source_organization_id: employee.organization_id, shared_employee: employee.organization_id !== device.organization_id, store_id: device.store_id, kiosk_device_id: device.id, store_pay_override: Boolean(storePay), warning } });
      return json(req, { ok: true, action: "clock_in", employee_name: employee.name, timestamp: entry.actual_clock_in, payable_start: entry.payable_clock_in, warning });
    }

    let payableOut = now;
    let warning = null;
    let early = false;
    let adjusted = false;
    let closeUtc = openEntry.scheduled_close_at ? DateTime.fromISO(openEntry.scheduled_close_at, { zone: "utc" }) : null;
    if (!closeUtc) { const window = await operatingWindow(openEntry.actual_clock_in); if (window) closeUtc = window.close.toUTC(); }
    if (closeUtc) {
      early = nowUtc < closeUtc;
      adjusted = nowUtc > closeUtc;
      const payableIn = DateTime.fromISO(openEntry.payable_clock_in || openEntry.actual_clock_in, { zone: "utc" });
      let out = nowUtc > closeUtc ? closeUtc : nowUtc;
      if (out < payableIn) out = payableIn;
      payableOut = out.toISO();
    } else if (openEntry.payroll_logic_snapshot === "dfw") {
      payableOut = openEntry.payable_clock_in || openEntry.actual_clock_in;
      warning = "Operating hours are not configured for this business day. Payable time was set to zero pending manager review.";
    }

    const { data: entry, error: updateError } = await admin.from("time_entries").update({ actual_clock_out: now, payable_clock_out: payableOut, early_clock_out: early, close_time_adjusted: adjusted || Boolean(openEntry.close_time_adjusted) }).eq("id", openEntry.id).select("id,actual_clock_out,payable_clock_out,early_clock_out,close_time_adjusted").single();
    if (updateError) throw updateError;
    await admin.from("audit_logs").insert({ organization_id: openEntry.organization_id, actor_user_id: null, action: "employee_clock_out", entity_type: "time_entry", entity_id: entry.id, details: { employee_id: employee.id, store_id: openEntry.store_id, kiosk_device_id: device.id, shared_employee: employee.organization_id !== device.organization_id, early_clock_out: early, close_time_adjusted: entry.close_time_adjusted, warning } });
    return json(req, { ok: true, action: "clock_out", employee_name: employee.name, timestamp: entry.actual_clock_out, warning: warning || (early ? "Clocked out before scheduled store closing." : adjusted ? "Payable time was capped at scheduled store closing." : null) });
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Unexpected shared punch error";
    return json(req, { error: message }, 500);
  }
});

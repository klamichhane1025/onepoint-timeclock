# Event Booth POS (HOT 2026)

## Scope
Isolated event POS at `/event-pos/` on the existing OnePoint Timeclock Vercel project. A registered, trusted Timeclock browser stores `onepoint_kiosk_token`. Employee signs in with their existing numeric employee ID and alphanumeric PIN. Event POS verifies device + PIN server-side using the current bcrypt hash. Login starts or resumes an **event-only** shift; it does **not** insert into `public.time_entries`, payroll, or timeclock attendance tables. Shift closing records actual cash and card settlement, over/short, and an event-specific clock-out.

## Deploy sequence
1. Review the feature PR. Do **not** merge before the next steps pass.
2. Apply `supabase/migrations/20261007_event_booth_pos.sql` once to the linked Supabase project using its migration tooling. All objects have `event_booth_` prefix. It creates new tables/functions only.
3. Deploy `supabase/functions/event-booth-pos/index.ts` as the Edge Function `event-booth-pos`. This function uses **custom kiosk device-token + employee session authentication**, so Supabase platform `verify_jwt` must be disabled for this specific endpoint. The service-role key exists in Edge Function environment only, never in Vercel/browser.
4. Deploy a **Vercel preview** from this branch, activate / recover the existing registered Timeclock browser first. Preview domains are not in the Edge Function CORS allowlist, so run interactive preview against an approved staging domain added to the allowlist. Do not disable CORS.
5. Test the cases below, then promote through a reviewed merge to main. Event POS URL is `https://timeclock.onepointsystems.io/event-pos/`.

## Operational checks
- Invalid employee ID / PIN is rejected, throttled after five recent failed attempts on a device.
- Unregistered or inactive kiosk device is rejected.
- Same employee signing in twice resumes **one** open event shift; ordinary `time_entries` remains unaffected.
- Employees only see their own completed event shifts and sales. Store-level product catalog is shared.
- The employee has to set starter product prices and starting stock before selling.
- Cash checkout requires sufficient tender and calculates change; card requires external terminal approval.
- Two simultaneous checkouts for the last unit cannot both succeed.
- Duplicate client request IDs do not double-decrement inventory or record duplicate sales.
- Void reverses inventory and excludes its sale from expected totals (separately refund actual card payment).
- Reconciliation totals include **all** sales, even after the first 250 displayed.
- Close shift computes variance server-side: `counted cash − float + card settlement − (expected cash + expected card)`.
- A closed shift cannot record sales; subsequent employee login starts another shift.
- Prior employee records, regular payroll records, RLS policies and triggers are not modified.
- Verify Supabase security/performance advisors and the Vercel preview before production.

## Boundaries
This app **does not** process card payments, calculate processing fees or track cost of goods. There is no offline transaction queue: do not use it disconnected. A live production rollout requires testing with real activated kiosk devices and employee credentials. Device token stored by the existing timeclock should not be copied between unrelated browsers.

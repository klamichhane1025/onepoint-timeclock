-- OnePoint Time Clock employee punch schedule policy
-- Intended production rule:
-- 1) employee payable clock-in uses the actual employee punch time;
-- 2) clock-out on/before captured store close uses actual punch time;
-- 3) clock-out after captured store close preserves actual_clock_out for audit
--    but caps payable_clock_out at scheduled_close_at;
-- 4) missed clock-out auto-finalization remains blocked until store close + 60 minutes.

create or replace function private.enforce_employee_punch_schedule_policy()
returns trigger
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_effective_out timestamptz;
begin
  if tg_op = 'INSERT' then
    if new.actual_clock_in is not null then
      new.payable_clock_in := new.actual_clock_in;
    end if;
  elsif new.actual_clock_in is distinct from old.actual_clock_in
        and new.actual_clock_in is not null then
    new.payable_clock_in := new.actual_clock_in;
  end if;

  if tg_op = 'UPDATE'
     and old.actual_clock_out is null
     and new.actual_clock_out is null
     and coalesce(old.missed_clock_out,false) = false
     and coalesce(new.missed_clock_out,false) = true
     and new.scheduled_close_at is not null
     and now() < new.scheduled_close_at + interval '1 hour'
  then
    raise exception 'Missed clock-out grace period is still active.' using errcode = '23514';
  end if;

  if new.actual_clock_out is not null and new.scheduled_close_at is not null then
    v_effective_out := least(new.actual_clock_out, new.scheduled_close_at);
    new.payable_clock_out := greatest(
      coalesce(new.payable_clock_in, new.actual_clock_in),
      v_effective_out
    );
    new.early_clock_out := new.actual_clock_out < new.scheduled_close_at;
    if new.actual_clock_out > new.scheduled_close_at then
      new.close_time_adjusted := true;
    end if;
  elsif new.actual_clock_out is null
        and coalesce(new.missed_clock_out,false) = true
        and new.scheduled_close_at is not null then
    new.payable_clock_out := greatest(
      coalesce(new.payable_clock_in, new.actual_clock_in),
      new.scheduled_close_at
    );
    new.close_time_adjusted := true;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_cap_employee_grace_clockout_at_store_close on public.time_entries;
drop trigger if exists trg_enforce_employee_punch_schedule_policy on public.time_entries;

create trigger trg_enforce_employee_punch_schedule_policy
before insert or update of actual_clock_in, actual_clock_out, payable_clock_in, payable_clock_out, missed_clock_out, close_time_adjusted
on public.time_entries
for each row
execute function private.enforce_employee_punch_schedule_policy();

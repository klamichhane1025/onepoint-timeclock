-- A system-finalized missed clock-out intentionally leaves actual_clock_out NULL
-- so the employee's physical punch history is not fabricated. Such a row must
-- not continue to reserve the employee's single-open-shift slot.

drop index if exists public.one_open_time_entry_per_employee;

create unique index one_open_time_entry_per_employee
on public.time_entries (organization_id, employee_id)
where actual_clock_out is null
  and is_void = false
  and missed_clock_out = false;

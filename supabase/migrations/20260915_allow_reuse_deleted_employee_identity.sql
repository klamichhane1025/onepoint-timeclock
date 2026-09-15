-- Deleted employees keep their canonical row and historical time-entry references,
-- but no longer reserve the active Owner roster's Employee ID or normalized name.
-- Inactive employees still reserve both values so they can be reactivated safely.

alter table public.employees
  drop constraint if exists employees_organization_id_employee_number_key;

drop index if exists public.employees_org_normalized_name_uq;
drop index if exists public.employees_organization_id_employee_number_key;

create unique index employees_organization_id_employee_number_key
  on public.employees (organization_id, employee_number)
  where status <> 'deleted';

create unique index employees_org_normalized_name_uq
  on public.employees (organization_id, lower(btrim(name)))
  where status <> 'deleted';

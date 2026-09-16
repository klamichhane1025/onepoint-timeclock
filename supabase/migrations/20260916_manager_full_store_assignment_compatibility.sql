-- Manager permissions are organization-wide. Keep the legacy organization_user_stores
-- mapping fully populated so older server paths that still consult it cannot reduce access.

create or replace function private.ensure_manager_full_store_access(p_organization_id uuid default null, p_manager_membership_id uuid default null)
returns void
language plpgsql
security definer
set search_path = 'public','private','pg_temp'
as $$
begin
  insert into public.organization_user_stores(organization_id, organization_user_id, store_id)
  select ou.organization_id, ou.id, s.id
  from public.organization_users ou
  join public.stores s on s.organization_id = ou.organization_id and s.active = true
  where ou.role = 'manager'
    and ou.active = true
    and (p_organization_id is null or ou.organization_id = p_organization_id)
    and (p_manager_membership_id is null or ou.id = p_manager_membership_id)
  on conflict do nothing;
end;
$$;

create or replace function private.manager_membership_fill_all_stores()
returns trigger
language plpgsql
security definer
set search_path = 'public','private','pg_temp'
as $$
begin
  if new.role = 'manager' and new.active = true then
    perform private.ensure_manager_full_store_access(new.organization_id, new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_manager_membership_fill_all_stores on public.organization_users;
create trigger trg_manager_membership_fill_all_stores
after insert or update of active, role, organization_id on public.organization_users
for each row execute function private.manager_membership_fill_all_stores();

create or replace function private.new_store_fill_all_managers()
returns trigger
language plpgsql
security definer
set search_path = 'public','private','pg_temp'
as $$
begin
  if new.active = true then
    perform private.ensure_manager_full_store_access(new.organization_id, null);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_new_store_fill_all_managers on public.stores;
create trigger trg_new_store_fill_all_managers
after insert or update of active, organization_id on public.stores
for each row execute function private.new_store_fill_all_managers();

create or replace function private.prevent_duplicate_manager_store_assignment()
returns trigger
language plpgsql
security definer
set search_path = 'public','private','pg_temp'
as $$
begin
  if exists (
    select 1 from public.organization_user_stores x
    where x.organization_user_id = new.organization_user_id
      and x.store_id = new.store_id
  ) then
    return null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_prevent_duplicate_manager_store_assignment on public.organization_user_stores;
create trigger trg_prevent_duplicate_manager_store_assignment
before insert on public.organization_user_stores
for each row execute function private.prevent_duplicate_manager_store_assignment();

create or replace function private.manager_store_delete_restore_full_access()
returns trigger
language plpgsql
security definer
set search_path = 'public','private','pg_temp'
as $$
begin
  if exists (
    select 1 from public.organization_users ou
    where ou.id = old.organization_user_id
      and ou.role = 'manager'
      and ou.active = true
  ) then
    perform private.ensure_manager_full_store_access(old.organization_id, old.organization_user_id);
  end if;
  return old;
end;
$$;

drop trigger if exists trg_manager_store_delete_restore_full_access on public.organization_user_stores;
create trigger trg_manager_store_delete_restore_full_access
after delete on public.organization_user_stores
for each row execute function private.manager_store_delete_restore_full_access();

select private.ensure_manager_full_store_access(null, null);
-- Managers retain role='manager' for identity/audit, but receive Owner-equivalent
-- operational authorization inside their own organization. Platform Admin remains separate.

create or replace function private.is_org_owner(p_org uuid)
returns boolean
language sql
stable
security definer
set search_path = 'public', 'private'
as $$
  select private.is_platform_admin() or exists (
    select 1
    from public.organization_users ou
    where ou.organization_id = p_org
      and ou.user_id = auth.uid()
      and ou.active = true
      and ou.role in ('owner','manager')
  );
$$;

create or replace function private.can_access_store(p_org uuid, p_store uuid)
returns boolean
language sql
stable
security definer
set search_path = 'public', 'private'
as $$
  select private.is_platform_admin()
  or exists (
    select 1
    from public.organization_users ou
    where ou.organization_id = p_org
      and ou.user_id = auth.uid()
      and ou.active = true
      and ou.role in ('owner','manager')
  )
  or exists (
    select 1
    from public.store_shares ss
    join public.organization_users ou
      on ou.organization_id = ss.shared_organization_id
    where ss.store_id = p_store
      and ss.active = true
      and ou.user_id = auth.uid()
      and ou.active = true
      and ou.role in ('owner','manager')
  );
$$;

drop policy if exists organization_store_order_manager_select on public.organization_store_order;
drop policy if exists organization_store_order_select on public.organization_store_order;
drop policy if exists organization_store_order_insert on public.organization_store_order;
drop policy if exists organization_store_order_update on public.organization_store_order;
drop policy if exists organization_store_order_delete on public.organization_store_order;

create policy organization_store_order_select on public.organization_store_order
for select to authenticated
using (private.is_platform_admin() or (private.is_org_owner(organization_id) and private.can_access_store(organization_id, store_id)));

create policy organization_store_order_insert on public.organization_store_order
for insert to authenticated
with check (private.is_platform_admin() or (private.is_org_owner(organization_id) and private.can_access_store(organization_id, store_id)));

create policy organization_store_order_update on public.organization_store_order
for update to authenticated
using (private.is_platform_admin() or (private.is_org_owner(organization_id) and private.can_access_store(organization_id, store_id)))
with check (private.is_platform_admin() or (private.is_org_owner(organization_id) and private.can_access_store(organization_id, store_id)));

create policy organization_store_order_delete on public.organization_store_order
for delete to authenticated
using (private.is_platform_admin() or (private.is_org_owner(organization_id) and private.can_access_store(organization_id, store_id)));

create or replace function public.schedule_employee_pay_change(p_organization_id uuid, p_employee_id uuid, p_pay_type text, p_pay_rate numeric, p_effective_at timestamptz default null)
returns uuid
language plpgsql
security definer
set search_path = 'public', 'private'
as $$
declare
  v_change_id uuid;
  v_effective timestamptz := coalesce(p_effective_at, now());
  v_emp public.employees%rowtype;
  v_is_admin boolean := private.is_platform_admin();
  v_actor_role text;
begin
  if not v_is_admin and not private.is_org_owner(p_organization_id) then
    raise exception 'Owner or Manager access is required to schedule employee pay changes.';
  end if;
  if p_pay_type not in ('hourly','monthly') or p_pay_rate is null or p_pay_rate < 0 then
    raise exception 'Enter a valid pay type and pay amount.';
  end if;
  select * into v_emp from public.employees where id=p_employee_id and organization_id=p_organization_id and status='active';
  if not found then raise exception 'Employee not found or inactive.'; end if;
  if v_is_admin then v_actor_role := 'platform_admin';
  else select role::text into v_actor_role from public.organization_users where organization_id=p_organization_id and user_id=auth.uid() and active=true limit 1; end if;
  insert into private.employee_pay_changes(organization_id,employee_id,pay_type,pay_rate,effective_at,created_by)
  values(p_organization_id,p_employee_id,p_pay_type,p_pay_rate,v_effective,auth.uid()) returning id into v_change_id;
  insert into public.audit_logs(organization_id,actor_user_id,action,entity_type,entity_id,details)
  values(p_organization_id,auth.uid(),'employee_pay_change_scheduled','employee',p_employee_id,
    jsonb_build_object('change_id',v_change_id,'pay_type',p_pay_type,'pay_rate',p_pay_rate,'effective_at',v_effective,'applies_at_next_new_shift',true,'actor_role',coalesce(v_actor_role,'member')));
  return v_change_id;
end;
$$;

create or replace function public.list_employee_pay_changes(p_organization_id uuid)
returns table(id uuid, employee_id uuid, pay_type text, pay_rate numeric, effective_at timestamptz, status text, created_at timestamptz, applied_at timestamptz, cancelled_at timestamptz)
language plpgsql
security definer
set search_path = 'public', 'private'
as $$
begin
  if not private.is_platform_admin() and not private.is_org_owner(p_organization_id) then
    raise exception 'Owner or Manager access is required to view employee pay changes.';
  end if;
  return query
  select c.id,c.employee_id,c.pay_type,c.pay_rate,c.effective_at,c.status,c.created_at,c.applied_at,c.cancelled_at
  from private.employee_pay_changes c where c.organization_id=p_organization_id order by c.effective_at desc,c.created_at desc;
end;
$$;

create or replace function public.cancel_employee_pay_change(p_change_id uuid)
returns boolean
language plpgsql
security definer
set search_path = 'public', 'private'
as $$
declare
  v private.employee_pay_changes%rowtype;
  v_is_admin boolean := private.is_platform_admin();
  v_actor_role text;
begin
  select * into v from private.employee_pay_changes where id=p_change_id;
  if not found then raise exception 'Pay change not found.'; end if;
  if not v_is_admin and not private.is_org_owner(v.organization_id) then
    raise exception 'Owner or Manager access is required to cancel employee pay changes.';
  end if;
  if v.status <> 'scheduled' then raise exception 'Only scheduled pay changes can be cancelled.'; end if;
  if v_is_admin then v_actor_role := 'platform_admin';
  else select role::text into v_actor_role from public.organization_users where organization_id=v.organization_id and user_id=auth.uid() and active=true limit 1; end if;
  update private.employee_pay_changes set status='cancelled',cancelled_at=now(),cancelled_by=auth.uid() where id=p_change_id;
  insert into public.audit_logs(organization_id,actor_user_id,action,entity_type,entity_id,details)
  values(v.organization_id,auth.uid(),'employee_pay_change_cancelled','employee',v.employee_id,jsonb_build_object('change_id',v.id,'effective_at',v.effective_at,'actor_role',coalesce(v_actor_role,'member')));
  return true;
end;
$$;

create or replace function public.set_organization_portal_theme(p_organization_id uuid, p_theme text)
returns text
language plpgsql
security definer
set search_path = 'public', 'private'
as $$
begin
  if p_theme not in ('blue','emerald','violet','amber') then raise exception 'Invalid theme'; end if;
  if not private.is_org_owner(p_organization_id) then raise exception 'Owner or Manager access required'; end if;
  update public.organizations set portal_theme=p_theme where id=p_organization_id;
  insert into public.audit_logs(organization_id,actor_user_id,action,entity_type,entity_id,details)
  values(p_organization_id,auth.uid(),'portal_theme_changed','organization',p_organization_id,jsonb_build_object('theme',p_theme));
  return p_theme;
end;
$$;

create or replace function public.set_organization_portal_theme_custom(p_organization_id uuid, p_accent text, p_hover text, p_soft text, p_text text)
returns jsonb
language plpgsql
security definer
set search_path = 'public', 'private'
as $$
declare v_palette jsonb;
begin
  if p_accent !~ '^#[0-9A-Fa-f]{6}$' or p_hover !~ '^#[0-9A-Fa-f]{6}$' or p_soft !~ '^#[0-9A-Fa-f]{6}$' or p_text !~ '^#[0-9A-Fa-f]{6}$' then raise exception 'Use valid 6-digit hex colors.'; end if;
  if not private.is_org_owner(p_organization_id) then raise exception 'Owner or Manager access required'; end if;
  v_palette=jsonb_build_object('accent',upper(p_accent),'hover',upper(p_hover),'soft',upper(p_soft),'text',upper(p_text));
  update public.organizations set portal_theme='custom',portal_theme_custom=v_palette where id=p_organization_id;
  insert into public.audit_logs(organization_id,actor_user_id,action,entity_type,entity_id,details)
  values(p_organization_id,auth.uid(),'portal_theme_custom_changed','organization',p_organization_id,v_palette);
  return v_palette;
end;
$$;
drop policy if exists organization_store_order_manager_select on public.organization_store_order;

create policy organization_store_order_manager_select
on public.organization_store_order
for select
to authenticated
using (
  exists (
    select 1
    from public.organization_users ou
    where ou.organization_id = organization_store_order.organization_id
      and ou.user_id = auth.uid()
      and ou.role = 'manager'::public.org_role
      and ou.active = true
  )
  and private.can_access_store(organization_store_order.organization_id, organization_store_order.store_id)
);

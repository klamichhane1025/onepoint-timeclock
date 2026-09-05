# OnePoint Time Clock — Finalized Product Rules

## Tenant isolation
- Each owner/business is a separate organization (tenant).
- Owners and managers can access only their own organization and assigned stores.
- Platform Admin is the only cross-tenant role.
- Supabase RLS will enforce organization isolation; UI filtering alone is not sufficient.

## Employee identity
- Employee identity is scoped to the organization, never globally.
- Employee ID must be unique within one organization.
- Normalized employee name must be unique within one organization.
- The same employee ID, name, or exact name+ID combination may exist in a different organization.
- Automatic employee IDs increment from the highest employee ID within that organization only.
- Deleted/deactivated employees do not erase clock history.

Future database constraints:
- UNIQUE (organization_id, employee_id)
- UNIQUE (organization_id, normalized_employee_name)

## Time history
- Clock-in/out history is retained indefinitely in the product model.
- Removing a clock record from active timesheets is a soft delete/void only.
- Deleted records remain in History & Audit and can be restored.
- Manual edits retain original values and audit metadata.

## Payroll
- Employee pay rate is optional.
- Job code is optional.
- DFW Logic caps payable punches to configured store operating hours.
- Basic Logic uses actual punch times.
- Payroll can be viewed by employee, by store, or across all stores owned by the organization.
- Managers see payroll only for authorized stores.

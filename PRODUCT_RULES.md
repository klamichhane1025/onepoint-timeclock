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
- The same employee ID or name may exist in a completely unrelated organization.
- Once organizations are connected by an active shared-store/employee relationship, every employee visible in the receiving Owner's combined roster (owned + shared employees) must have a unique normalized name so payroll, timesheets, and employee selection remain unambiguous.
- If a shared-roster name conflict exists, one employee must be renamed before the share/assignment can continue.
- Sharing an employee never creates a second employee account. The shared employee keeps the same canonical employee record, Employee ID, PIN, and login across participating locations.
- A receiving Owner must not create a duplicate employee record merely to make a shared employee available.
- Automatic employee IDs increment from the highest employee ID within that organization only.
- Deleted/deactivated employees do not erase clock history.

Database constraints / guards:
- UNIQUE (organization_id, employee_id)
- UNIQUE (organization_id, normalized_employee_name)
- Shared-roster name-conflict guards across active `employee_org_shares`.

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
- Payroll can be viewed by employee, by store, or across all stores owned by or shared to the organization where access is authorized.
- Managers see payroll only for authorized stores.

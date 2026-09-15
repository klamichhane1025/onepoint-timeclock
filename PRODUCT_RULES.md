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

## PIN and password entry
- Password and PIN fields provide a visibility control so the user can temporarily reveal the entered secret.
- When an Owner or Platform Admin creates a new employee PIN, the PIN must be entered twice before the employee can be saved.
- When an employee PIN is changed, both new-PIN fields must either be blank to keep the current PIN or contain the same valid 4–8 digit PIN.
- PIN confirmation shows a live green `Match` state when both entries match and a red mismatch state when they do not.
- PIN confirmation does not create a second credential; only the single canonical employee PIN is stored.

## Time history and live attendance
- Clock-in/out history is retained indefinitely in the product model.
- Removing a clock record from active timesheets is a soft delete/void only.
- Deleted records remain in History & Audit and can be restored.
- Manual edits retain original values and audit metadata.
- Owner and Manager Overview show one live `Clocked In Now` metric containing only the number of employees currently clocked in.
- The live metric updates when employees clock in or out; it does not add a detailed live-attendance panel to Timesheets & Payroll.
- Platform Admin Owner View does not receive this Owner/Manager live-count card.

## Location ordering
- Each Owner can drag and drop accessible locations into a preferred display order.
- The order is persistent per Owner organization and is shared between the Locations page and Overview store cards.
- Shared locations can participate in the receiving Owner's display order without changing the source Owner's order or ownership.
- Platform Admin Owner View uses the selected Owner's same stored location order and may adjust that order with Platform Admin authority.

## Payroll
- Employee pay rate is optional.
- Job code is optional.
- DFW Logic caps payable punches to configured store operating hours.
- Basic Logic uses actual punch times.
- Payroll can be viewed by employee, by store, or across all stores owned by or shared to the organization where access is authorized.
- Managers see payroll only for authorized stores.
- Store Payroll Overview uses a drilldown flow: select a store, select a dated completed payroll period, then view each employee who worked that store during the period with employee hours, pay rate/pay, total hours, and total hourly payroll for the store.

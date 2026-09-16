# OnePoint Time Clock — Finalized Product Rules

## Tenant isolation
- Each owner/business is a separate organization (tenant).
- Owners and managers can access only their own organization and assigned stores.
- Platform Admin is the only cross-tenant role.
- Supabase RLS will enforce organization isolation; UI filtering alone is not sufficient.

## Portal sessions and POS security
- On normal Owner/Manager workstations, OnePoint persists the authenticated session and relies on Supabase refresh-token rotation so the user is not repeatedly signed out merely because the tab or browser was closed.
- This is session continuity, not an immortal access token. Explicit logout, credential/security changes, token revocation, browser-data clearing, or other security events may still end the session.
- Platform Admin remains browser-session scoped on ordinary devices unless another explicit security policy is adopted.
- A browser registered as a OnePoint POS/cashier device keeps its trusted Time Clock device credential, but it must not persist Owner, Manager, or Platform Admin portal authentication.
- A fresh navigation from a registered POS device into Owner, Manager, or Admin requires a fresh human login. Reloading an already-open authenticated portal page does not intentionally interrupt the user mid-task.
- Platform Admin may activate a new POS from either the Time Clock activation route or the cashier-domain `/activate` route; both must require fresh Platform Admin authentication on a registered POS.

## Employee identity
- Employee identity is scoped to the organization, never globally.
- Employee ID must be unique among non-deleted employees within one organization.
- Normalized employee name must be unique among non-deleted employees within one organization.
- The same employee ID or name may exist in a completely unrelated organization.
- Once organizations are connected by an active shared-store/employee relationship, every employee visible in the receiving Owner's combined roster (owned + shared employees) must have a unique normalized name so payroll, timesheets, and employee selection remain unambiguous.
- If a shared-roster name conflict exists, one employee must be renamed before the share/assignment can continue.
- Sharing an employee never creates a second employee account. The shared employee keeps the same canonical employee record, Employee ID, PIN, and login across participating locations.
- A receiving Owner must not create a duplicate employee record merely to make a shared employee available.
- Automatic employee IDs increment from the highest employee ID within that organization only.
- Deleting an employee is a soft delete: the canonical employee row and all historical punches/audit history remain intact.
- Once an employee is deleted, that Employee ID and normalized name may be reused for a new employee in the same organization.
- An inactive but not deleted employee continues to reserve its Employee ID and normalized name so it can be safely reactivated later.

Database constraints / guards:
- Partial UNIQUE `(organization_id, employee_number)` where `status <> 'deleted'`.
- Partial UNIQUE `(organization_id, lower(btrim(name)))` where `status <> 'deleted'`.
- Shared-roster name-conflict guards across active `employee_org_shares`.

## PIN and password entry
- Password and PIN fields provide a visibility control so the user can temporarily reveal the entered secret.
- Only one visibility/reveal control should be shown per password or PIN field; duplicate eye icons must be suppressed.
- When an Owner or Platform Admin creates a new employee PIN, the PIN must be entered twice before the employee can be saved.
- When an employee PIN is changed, both new-PIN fields must either be blank to keep the current PIN or contain the same valid 4–8 digit PIN.
- PIN confirmation shows a live green `Match` state when both entries match and a red mismatch state when they do not.
- PIN confirmation does not create a second credential; only the single canonical employee PIN is stored.

## Manager invitations and access
- Manager onboarding uses the same secure 24-hour OnePoint invitation-token flow as Owner onboarding.
- Pending and expired Manager invitations may be resent manually; resending invalidates the previous unused invitation token.
- Before a Manager accepts the invitation, the Owner may edit the Manager name, login email, and assigned locations. Saving a pending invitation issues a fresh invitation and invalidates the previous link.
- An active Manager's login email is not changed from the invitation editor; active-account credential changes must use an authenticated account/security workflow.
- A pending or expired Manager invitation may be cancelled. Cancellation invalidates the outstanding invitation token, preserves the membership/audit history, and prevents the cancelled link from being accepted.
- Managers are displayed in separate Active, Invitations, and Inactive views. Cancelled invitations are retained for audit but do not remain in the actionable invitation list.
- The Active Manager view displays the Manager's most recent authenticated sign-in time when available; if no successful sign-in exists, show `Never signed in`.
- Manager location assignments remain restricted to stores belonging to or accessible within the Owner organization; invitation management does not expand Manager permissions.

## Time history and live attendance
- Clock-in/out history is retained indefinitely in the product model.
- Removing a clock record from active timesheets is a soft delete/void only.
- Deleted records remain in History & Audit and can be restored.
- Manual edits retain original values and audit metadata.
- Owner and Manager Overview use a small top-right `Live Employees` status button instead of a dashboard metric tile.
- The Live Employees button shows the number of employees currently clocked in as a compact badge.
- Hovering, focusing, or clicking the Live Employees button shows the currently clocked-in employees with their location and clock-in time.
- The Live Employees hover target includes the popup itself so the panel remains visible while the pointer moves from the header icon into the employee list.
- Live employee status updates when employees clock in or out through Supabase Realtime; it does not add a detailed live-attendance panel to Timesheets & Payroll.
- Platform Admin Owner View does not receive this Owner/Manager live-status control.
- Each employee punch is independent, so multiple employees may be clocked in at the same store at the same time.
- The employee's physical clock-in punch is the effective/payable clock-in time. Scheduled store opening is retained as schedule metadata and must not replace a real employee clock-in punch.
- If an employee physically clocks out on or before that shift's captured scheduled store closing time, the employee's physical clock-out is the effective/payable clock-out time.
- If an employee physically clocks out after the captured scheduled store closing time, OnePoint preserves the physical `actual_clock_out` for audit/history but caps the effective/payable clock-out at the captured store closing time.
- A clock-out adjusted to store closing is shown in Owner, Manager, and Admin timesheets with an asterisk (`*`) next to the displayed Clock Out time.
- The asterisk means the displayed Clock Out is the store-closing adjustment; the employee's later physical punch remains preserved in the audit record.
- If an employee remains clocked in at that store's captured scheduled closing time, OnePoint waits the full 60 minutes before treating the shift as a missed clock-out.
- During that 60-minute grace period the employee remains clocked in and may still physically clock out; the same store-close cap above applies if that punch is late.
- If the shift is still open after the full 60-minute grace period, OnePoint automatically finalizes the shift effective at the captured store closing time, marks it as a missed clock-out / close-time adjustment, and records the later system-finalization timestamp for audit purposes.
- Automatic missed-clock-out finalization does not fabricate a physical punch: `actual_clock_out` remains distinguishable from the system-applied payable closing time.
- Once a missed shift is system-finalized, it is no longer considered an active/open shift for concurrency checks and must not block that employee from clocking in at another authorized store under the same Owner.

## Location ordering
- Each Owner can drag and drop accessible locations into a preferred display order.
- The order is persistent per Owner organization and is shared between the Locations page and Overview store cards.
- The Owner's saved location order is the preferred store order for store selectors and location-access lists throughout Owner, Manager, and Platform Admin Owner View where the same stores are displayed.
- Timesheets & Payroll location selectors must follow this preferred order instead of reverting to store-code or database query order.
- Employee primary-location selectors and Manager location-access selectors should use the same preferred order when those accessible stores are shown.
- Managers may read the Owner's preferred order for locations they are authorized to access, but Managers cannot modify the Owner's saved order.
- Shared locations can participate in the receiving Owner's display order without changing the source Owner's order or ownership.
- Platform Admin Owner View uses the selected Owner's same stored location order and may adjust that order with Platform Admin authority.

## Portal branding and status presentation
- Owner and Manager sidebars use the organization branding area as a centered identity block.
- The organization logo appears first when configured, followed directly by the organization/business name.
- After a clear vertical gap, the sidebar displays centered `OnePoint` and `Time & Attendance` product branding.
- The top-right Owner/Manager identity displays the person's name prominently and does not repeat an Owner/Manager role tag.
- Status presentation is consistent across the OnePoint application: `Active` uses a solid green badge with high-contrast text; `Inactive` and `Expired` use a solid red badge with high-contrast text.
- Status color is a presentation aid only and never changes the underlying authorization, invitation, or organization state.

## Payroll
- Employee pay rate is optional.
- Job code is optional.
- Scheduled opening and closing times are captured on the shift for schedule comparison and closing-time enforcement, but a real employee clock-in punch remains the payable start time.
- Scheduled Open and Scheduled Close are backend/audit metadata and are not shown as normal Timesheets & Payroll columns.
- Adjusted and missed clock-outs are explained contextually from the Clock Out value on hover/focus rather than through permanent schedule columns.
- For both DFW and Basic payroll presentation, a real clock-out on or before captured store close uses the real punch time; a real clock-out after captured store close is capped to captured store close for payable hours while retaining the actual punch for audit.
- Payroll can be viewed by employee, by store, or across all stores owned by or shared to the organization where access is authorized.
- Managers see payroll only for authorized stores.
- Store Payroll Overview uses a drilldown flow: select a store, select a dated completed payroll period, then view each employee who worked that store during the period with employee hours, pay rate/pay, total hours, and total hourly payroll for the store.

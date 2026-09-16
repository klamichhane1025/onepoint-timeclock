# OnePoint Timeclock — Agent Instructions

## UI skills
For any UI/UX work in this repository, read and follow both:

- `.agents/skills/puppertino-ui/SKILL.md`
- `.agents/skills/apple-design/SKILL.md`

Puppertino is the default component/layout foundation. The Apple design skill is the refinement layer for hierarchy, interaction response, motion, materials, typography, contextual help, and accessibility. If the two differ, preserve OnePoint product rules and security first, then use Puppertino for structure and Apple principles for the final interaction/visual treatment.

Treat these as the default UI design standard for Owner, Admin, Manager, Kiosk, payroll/timesheet, onboarding, settings, and related web interfaces unless the user explicitly asks for a different visual direction.

## Canonical platform UI layer
The platform-wide implementation lives in:

- `puppertino-platform.css` — canonical design tokens, layout, cards, forms, tables, modals, responsive behavior, shared-state styling, and kiosk treatment.
- `puppertino-platform.js` — canonical shell enhancement, navigation grouping/icons, page context, responsive navigation, and non-destructive UI decoration.
- `apple-interface.css` — shared Apple-style hierarchy, response, reduced-motion/transparency/contrast refinements.
- `apple-interface.js` — shared single-title/page-hierarchy cleanup and removal of redundant explanatory copy.

Extend these shared files before creating a page-specific visual patch. Page-specific CSS/JS is appropriate only when a feature genuinely cannot be expressed through the shared design system.

## Required behavior
- Preserve existing application logic, authentication, Supabase RLS/security boundaries, audit logging, payroll rules, and data ownership.
- Use Puppertino + Apple design as scoped visual/component/interaction layers, not as replacements for application logic.
- Prefer compact, content-sized controls, clear hierarchy, polished forms/modals/tables, responsive layouts, and Apple/macOS-inspired visual balance.
- Every page has one primary title in the application header. Do not repeat the same title again inside the first card or section.
- Prefer contextual hover/focus help for exceptional states instead of permanent explanatory copy when the meaning remains accessible.
- Keep operational schedule metadata in the backend even when it is intentionally hidden from the normal timesheet table.
- Keep full date and time visible where operationally important, especially Clock In and Clock Out in Timesheets & Payroll.
- Preserve OnePoint branding and the existing visual distinction for shared stores/shared employees unless explicitly changed.
- For shared-store payroll, preserve owner-specific pay-rate behavior and canonical shared punch records.
- Admin Owner View should expose the Owner operational feature set while retaining Platform Admin-only controls and audit authority.
- Validate desktop and mobile behavior after UI changes.
- Respect `prefers-reduced-motion`, `prefers-reduced-transparency`, keyboard focus, and practical touch targets.

## Information architecture
Use these navigation groups when applicable:
- Workspace — Overview/dashboard.
- People — Employees, Managers, Job Codes.
- Operations — Locations, Timesheets & Payroll, Devices.
- Settings — Account, plan, access, branding, security.
- Platform — Admin organization navigation.

Do not duplicate an existing feature into a new sidebar item solely for visual organization; group and label the existing feature instead.

If an upstream Puppertino API/class/import path is needed, re-check the current `codedgar/Puppertino` repository instead of guessing.
If Apple interaction/design guidance needs to be refreshed, re-check `emilkowalski/skills`, especially `skills/apple-design/SKILL.md`, instead of guessing.

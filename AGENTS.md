# OnePoint Timeclock — Agent Instructions

## UI skill
For any UI/UX work in this repository, read and follow:

`.agents/skills/puppertino-ui/SKILL.md`

Treat it as the default UI design standard for Owner, Admin, Manager, Kiosk, payroll/timesheet, onboarding, settings, and related web interfaces unless the user explicitly asks for a different visual direction.

## Required behavior
- Preserve existing application logic, authentication, Supabase RLS/security boundaries, audit logging, payroll rules, and data ownership.
- Use Puppertino as a scoped visual/component layer, not as a global replacement for the current design system.
- Prefer compact, content-sized controls, clear hierarchy, polished forms/modals/tables, responsive layouts, and Apple/macOS-inspired visual balance.
- Keep full date and time visible where operationally important, especially Timesheet & Payroll.
- Preserve OnePoint branding and the existing visual distinction for shared stores/shared employees unless explicitly changed.
- For shared-store payroll, preserve owner-specific pay-rate behavior and canonical shared punch records.
- Validate desktop and mobile behavior after UI changes.

If an upstream Puppertino API/class/import path is needed, re-check the current `codedgar/Puppertino` repository instead of guessing.

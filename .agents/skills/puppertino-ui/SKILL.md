# Puppertino UI Skill

## Purpose
Use Puppertino as a visual/component reference for clean, macOS-inspired web interfaces while preserving the host application's existing architecture, data model, business logic, security, accessibility, and responsive behavior.

Upstream project: `codedgar/Puppertino`
License: MIT
Reference: https://github.com/codedgar/Puppertino

## When to use this skill
Use this skill when designing, modernizing, or reviewing web application UI where the desired direction is:
- clean Apple/macOS-inspired presentation
- compact and visually balanced controls
- polished forms, buttons, tabs, navigation, cards, modals, segmented controls, blur, shadows, and spacing
- responsive desktop/tablet/mobile layouts
- modern visual hierarchy without unnecessary decoration

This skill is especially appropriate for dashboards, admin panels, CRM systems, payroll/timesheet interfaces, settings screens, and productivity applications.

## Core rule
Puppertino is a **design and component layer**, not a replacement for application logic.

Never replace or bypass:
- authentication
- authorization/RLS
- API/Edge Function behavior
- database schema or ownership rules
- payroll/business logic
- audit logging
- existing accessibility behavior
- existing data validation

When modifying an existing application, preserve the current functional behavior unless the user explicitly asks to change it.

## Integration strategy
Prefer modular adoption over importing the full framework globally.

Good:
```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/codedgar/Puppertino@latest/dist/css/buttons.css">
```

Or selective package imports:
```js
import '@codedgar/puppertino/buttons'
import '@codedgar/puppertino/forms'
import '@codedgar/puppertino/modals'
import '@codedgar/puppertino/tabs'
```

Avoid automatically importing the full framework into an established application because global selectors may unexpectedly override existing styles.

If the app has an existing design system, create a scoped bridge layer such as:
- `.op-pup-*`
- `.app-shell .pup-*`
- component-specific wrappers

This prevents collisions with legacy CSS.

## Visual principles
Apply these principles consistently:

### 1. Compact controls
- Size inputs to the content they need to contain.
- Do not make date, time, number, or short select fields full-width unless the layout requires it.
- Keep related controls on one line where practical.
- Use responsive wrapping on small screens.

Recommended desktop targets:
- date input: about 145–155px
- time input: about 105–120px
- datetime-local: about 180–195px
- money/rate input: about 105–125px
- short select: about 120–180px
- long text fields: only as wide as useful, with sensible max-width

### 2. Hierarchy
- Page title first.
- Primary metric/action second.
- Secondary controls visually quieter.
- Do not give every element equal visual weight.
- Use whitespace to separate groups instead of excessive borders.

### 3. Cards and surfaces
- Use subtle borders and soft shadows.
- Prefer moderate corner radius.
- Avoid heavy gradients or ornamental effects.
- Use background tint only when it communicates state or category.

### 4. Buttons
- One clearly dominant primary action per logical area.
- Secondary buttons should be quieter.
- Destructive actions must look destructive.
- Avoid oversized buttons for routine table actions.

### 5. Forms
- Labels should be short and explicit.
- Group related fields.
- Put validation/error messages near the relevant control.
- Preserve keyboard navigation and visible focus states.
- Do not hide required information behind hover only.

### 6. Tables and payroll/timesheet UIs
- Keep timestamps readable without excessive width.
- Prefer compact filters above the table.
- Sort/filter controls should not dominate the page.
- Use badges for punch state, shared-store state, review flags, etc.
- Preserve full underlying data even when visually abbreviated.

### 7. Shared/linked entities
When an application has shared stores, shared employees, linked accounts, or cross-tenant access:
- visually distinguish shared entities without making them look disabled
- use a consistent badge and subtle tinted background
- preserve the canonical record rather than duplicating it
- avoid implying ownership when the user merely has access

### 8. Responsive behavior
Desktop compactness must not make mobile unusable.
On narrow screens:
- allow controls to become full-width
- stack multi-column forms
- allow horizontal scrolling for data tables when necessary
- keep tap targets usable

## Puppertino component guidance
Puppertino includes design patterns/components for:
- buttons
- modals
- forms and inputs
- layout
- Apple-inspired colors
- segmented controls
- shadows and blur
- tabs
- navigation bars
- dark mode

Use only the components needed for the current screen.

## Dark mode
If the host application already has dark-mode behavior, integrate with it rather than introducing a second competing theme manager.
If no dark mode exists and the user requests it, Puppertino's dark-mode patterns may be used.

## Accessibility
A macOS-like appearance must not reduce accessibility.
Always preserve or add:
- keyboard accessibility
- semantic labels
- visible focus states
- sufficient color contrast
- non-color state indicators where important
- readable text sizing

## Existing application safety checklist
Before applying Puppertino to an existing project:
1. Inspect current global CSS and component classes.
2. Identify selectors likely to collide.
3. Scope Puppertino-based rules where possible.
4. Do not replace working JS behavior with Puppertino demo JS unless needed.
5. Test dialogs, forms, dropdowns, tables, and mobile layout.
6. Verify authentication, navigation, and save actions still work.
7. Verify no CSS change hides required controls or data.
8. Verify shared/tenant-specific states remain visually clear.

## OnePoint-specific guidance
For OnePoint projects:
- Keep the existing OnePoint branding and portal theme system.
- Use Puppertino as a refinement layer, not a rebrand.
- Preserve purple shared-store/shared-employee identification unless the user requests another system.
- Keep Timesheet & Payroll inputs compact.
- Keep full date AND time visible for punch records.
- Shared-store payroll rate overrides must remain owner-specific.
- Admin Owner View should visually match Owner View while retaining Admin-only controls.
- Never bypass Supabase RLS or service-role boundaries for appearance-related work.

## Implementation preference
When asked to "make this look more Apple-like" or "use the Puppertino skill":
1. Inspect the existing screen first.
2. Preserve current functional behavior.
3. Apply scoped Puppertino-inspired styles/components.
4. Prefer incremental modernization over full CSS replacement.
5. Validate responsive layout and critical interactions before finishing.

## Upstream reference usage
When implementation details are needed, consult the upstream Puppertino repository and examples rather than guessing class names or APIs.

Do not assume the upstream framework is unchanged forever. Re-check its current structure before relying on a specific import path in production.

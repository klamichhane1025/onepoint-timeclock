---
name: apple-design
description: Apple-inspired interface design and interaction principles for OnePoint, adapted from emilkowalski/skills apple-design. Use for UI hierarchy, responsive feedback, interaction motion, materials, typography, accessibility, drag/drop, popovers, tooltips, and reducing visual noise.
---

# Apple Design for OnePoint

Source inspiration: `emilkowalski/skills`, `skills/apple-design/SKILL.md` (MIT licensed). This local skill adapts those principles to OnePoint's existing Puppertino-based web application.

## Role in this repository

This is a **design and interaction refinement layer**. It does not replace Puppertino, application logic, Supabase, RLS, authentication, payroll rules, audit history, data ownership, or accessibility requirements.

Use Puppertino for the component foundation and this Apple skill for hierarchy, interaction feel, restraint, motion, and contextual presentation.

## Core principles

### 1. Response first
- Controls should react immediately on pointer/touch down.
- Avoid artificial delays, unnecessary debounces, and render loops.
- Keep the user-facing interaction path short and predictable.
- Prefer compositor-friendly `transform` and `opacity` for motion.

### 2. One clear hierarchy
- A page gets **one primary page title**. Never repeat the same page title again inside the first card or section.
- Section headings should describe a distinct section, not restate the page title.
- Remove explanatory copy that merely repeats what the UI already communicates.
- Prefer concise labels and contextual help over permanent instructional paragraphs.

### 3. Context instead of clutter
- Operational data required for calculations can remain in the backend without becoming a visible table column.
- Show exceptional state (adjusted, missed, warning, shared, etc.) next to the value it affects or in a hover/focus tooltip.
- Do not add a permanent legend when a concise contextual tooltip communicates the same information more directly.
- Preserve audit/history data even when the main UI is simplified.

### 4. Spatial consistency
- Popovers originate from the control that opens them.
- Enter/exit paths should be symmetrical.
- Drag/drop should track the pointer directly and use a dedicated handle when the rest of the surface is clickable.
- Do not make an entire clickable card draggable when a small drag handle can avoid gesture conflicts.

### 5. Restraint and materials
- Use light translucency and blur for floating chrome such as sticky headers and popovers, not every surface.
- Avoid stacking translucent surfaces.
- Prefer subtle borders/shadows and generous whitespace over heavy card chrome.
- Status colors should communicate meaning, not decorate the interface.

### 6. Typography
- Use the system/SF-style font stack already established by OnePoint.
- Large headings use tighter tracking and tighter line-height; body and small labels favor legibility.
- Establish hierarchy with size + weight + spacing, not repeated headings.
- Keep labels concise and sentence case unless an established product label requires otherwise.

### 7. Motion
- Motion should explain state changes, not call attention to itself.
- Default to critically damped/snappy motion with no bounce for ordinary UI.
- Reserve bounce/momentum for physical drag/flick interactions.
- Never block input just because an animation is running.

### 8. Accessibility
- All hover-only information must also be available on keyboard focus.
- Preserve visible `:focus-visible` states.
- Respect `prefers-reduced-motion: reduce` by disabling nonessential transforms and long transitions.
- Respect `prefers-reduced-transparency: reduce` by making translucent chrome opaque.
- Respect `prefers-contrast: more` with stronger borders and backgrounds.
- Keep touch targets practical on POS/tablet interfaces.

## OnePoint page-format rules

- Top application header `#title` is the primary page title.
- The first content card must not repeat `#title` as an `h2`.
- If removing a duplicate heading leaves only page actions, align those actions cleanly to the right rather than leaving an empty title column.
- Avoid subtitle copy such as architecture explanations, implementation details, or ownership mechanics when the screen already communicates them visually.
- Timesheet tables prioritize Employee, Location, Clock In, Clock Out, Hours, Pay and actions. Scheduled open/close remain backend schedule metadata unless specifically needed for an exception workflow.
- Adjusted and missed clock-outs should be identifiable from the Clock Out value itself, with hover/focus explanation.
- Shared-store purple treatment remains a meaningful state indicator and should not be removed.

## Safety / product guardrails

Never change or weaken:
- Supabase RLS or server-only table boundaries.
- authentication/session/device security;
- canonical employee identity or PIN behavior;
- payroll calculation rules;
- captured schedule metadata;
- time-entry audit history;
- shared-store ownership/pay-rate semantics;
- Admin Owner View authority.

When UI simplification conflicts with operational correctness, preserve the data and behavior and simplify only its presentation.

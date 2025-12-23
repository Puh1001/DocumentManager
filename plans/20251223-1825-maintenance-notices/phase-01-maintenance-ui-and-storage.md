# Phase 1: Maintenance UI and Storage

**Parent Plan:** [plan.md](./plan.md)  
**Status:** 🔲 Pending  
**Scope:** Build basic maintenance notice data flow for demo.

## Tasks

- Add `maintenance` namespace to i18n loader and message files (en/vi/zh).
- Create `use-maintenance-notices` hook to load/save notices (localStorage + defaults).
- Build Maintenance page with form for leads and list of notices.
- Sort and display notices by start date with readable chips.
- Keep file sizes under 200 lines and use existing UI components.

## Deliverables

- Hook returning `notices`, `addNotice`, `loading`, `error`.
- Maintenance page at `/dashboard/maintenance` showing form + list.
- Translations for all user-facing text.

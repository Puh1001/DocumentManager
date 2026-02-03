# Phase 03: Frontend Display Enhancement — Code Review

**Scope:** Code touched by [phase-03-frontend-display.md](../phase-03-frontend-display.md)  
**Checked against:** `./docs/code-standards.md`  
**Date:** 2026-01-30

---

## Summary

Phase 03 replaces placeholders in DocumentList with real ISO metadata: level (locale-aware name), preparer/reviewer/approver (fullName or username), approvalDate and receiptDate (locale date). Uses existing `formatDateShort` from `@/lib/utils`, adds small helpers in the component, and extends Document types on both the list and the page. No critical issues. One optional suggestion (shared Document type).

---

## Critical Issues

**None.** Display-only changes; null/undefined handled; dates wrapped in try/catch.

---

## Suggestions (addressed)

### 1. (Optional) Share Document type — DONE

**Where:** `document-list.tsx` and `apps/web/src/app/[locale]/dashboard/documents/page.tsx`

**Done:** Created `apps/web/src/lib/types/document.types.ts` with `DocumentLevel`, `DocumentUser`, `DocumentFolder`, and `Document`. Both `document-list.tsx` and the documents page now import `Document` (and list also imports `DocumentLevel`, `DocumentUser`) from `@/lib/types/document.types`. Single source of truth for document list/detail types.

---

## Positive Feedback

- **Code standards:** Matches Next.js frontend guidelines: `"use client"`, clear props interface, PascalCase interfaces, camelCase helpers. File under `components/documents/` is appropriate.
- **Reuse:** Uses existing `formatDateShort` from `@/lib/utils` instead of a new date utility (plan’s “create date formatter if not exists” satisfied).
- **Null safety:** All display helpers accept null/undefined and return PLACEHOLDER. `formatDateOrPlaceholder` uses try/catch so invalid date strings don’t throw.
- **Locale:** Level uses `getLevelDisplayName(level, locale)` with nameVi/nameZh/nameEn; dates use `formatDateShort(..., locale)`. Aligns with i18n.
- **User display:** `formatUserName` uses `fullName?.trim() || username || PLACEHOLDER`, so empty fullName and missing values are handled.
- **Types:** Document, DocumentLevel, DocumentUser are explicit; page Document interface extended to match API response (level, preparer, reviewer, approver, approvalDate, receiptDate).
- **UI:** No layout or responsive changes; existing table and styling kept. Placeholder "—" kept for missing data.

---

## Security

- **XSS:** All displayed values come from API and are rendered by React (auto-escaped). No `dangerouslySetInnerHTML`. Safe.
- **Data:** Showing names and dates from authenticated API; no new exposure.

---

## Performance

- **Per row:** A few string/date formatters per row; cost is negligible.
- **formatDateShort:** Single `Intl.DateTimeFormat` call per date; no heavy work.
- **No new queries or state:** Data comes from existing list response. No N+1, no extra re-renders.

---

## Conclusion

Phase 03 is in good shape: correct use of utils, safe null handling, locale-aware level and dates, and types aligned with the API. No blocking issues. Optional improvement: centralize Document (and related) types in a shared module. Recommend marking Phase 03 review complete.

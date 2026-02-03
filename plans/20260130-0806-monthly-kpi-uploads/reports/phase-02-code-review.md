# Phase 02 Code Review: Frontend — Month Selector & Monthly Uploads

**Scope:** Implementation per [phase-02-frontend-month-selector-and-uploads.md](../phase-02-frontend-month-selector-and-uploads.md)  
**Checked against:** `./docs/code-standards.md`  
**Date:** 2026-01-30

---

## Summary

Phase 02 adds a month selector next to the year dropdown, scopes attachment list and upload by month, and confirms when switching month with unsaved changes. The implementation matches the plan and fits existing patterns. A few items are worth tightening for consistency and maintainability (i18n, debug logging, effect deps).

---

## Critical Issues

**None.** No security or correctness issues identified. Month is validated (1–12) on both client and server; "All months" and upload default behavior are correct.

---

## Suggestions

### 1. i18n in `kpi-attachment-upload.tsx`

**Location:** `apps/web/src/components/boss/kpi-attachment-upload.tsx`

Toasts and labels use hardcoded Vietnamese:

- `"Lỗi"`, `"Chỉ chấp nhận file PDF"`, `"Thành công"`, `"Đã tải lên file PDF thành công"`, `"Không thể tải lên file"`, `"Đang tải..."`, `"Tải lên"`.

**Recommendation:** Add keys under `boss.kpi.attachments` (or reuse existing `kpi` / `common`) and use `t(...)` for all user-facing strings so EN/ZH/VI stay consistent. Same for fallbacks like `t("upload") || "Tải lên"` — use a single translation key.

### 2. Remove or gate debug logging

**Location:** `apps/web/src/components/boss/kpi-attachment-upload.tsx` (lines 33–41)

```ts
if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  console.log("[KpiAttachmentUpload] Debug:", { ... });
}
```

**Recommendation:** Remove before release, or keep behind a single debug flag (e.g. `DEBUG_KPI_UPLOAD`) so production bundles stay clean.

### 3. `useEffect` dependency: `selectedMonth`

**Location:** `apps/web/src/app/[locale]/dashboard/kpi/page.tsx` (line 274)

The effect that updates selected department and resets `hasAttemptedAutoCreate` lists `selectedMonth` in its dependency array but does not use it in the body. Plan text: "Reset auto-create flag when department or year changes."

**Recommendation:** If the intent is to reset only on department/year change, remove `selectedMonth` from the dependency array to avoid extra runs when only month changes. If resetting on month change is desired, leave as-is and optionally add a short comment.

### 4. Upload response type vs `KpiAttachment`

**Location:** `apps/web/src/components/boss/kpi-attachment-upload.tsx` (lines 81–90)

The upload API returns a subset of fields; the code builds a full `KpiAttachment` (including `fileName`, `uploadedBy`) for `onUploadSuccess`. `fileName` is taken from the `File` (correct); `uploadedBy` is set to `""`.

**Recommendation:** If the API can return `fileName` and `uploadedBy`, use them in the constructed object. Otherwise document that `uploadedBy` is filled elsewhere or leave a brief comment so future readers know it’s intentional.

---

## Positive Feedback

- **API client (`api.ts`):** Clear `KpiAttachment` type with `month?: number | null`. `getAttachments` and `uploadAttachment` only send `month` when it’s in 1–12; "All months" is handled by omitting the param. Matches code-standards pattern for optional params.
- **KPI page state:** `selectedMonth` defaults to current month (`new Date().getMonth() + 1`). Month dropdown uses `selectedMonth ?? ""` and `parseInt(v, 10)` for "All months" vs 1–12. Unsaved-changes confirm when changing month mirrors year/department behavior.
- **Upload component:** `selectedMonth` prop documented; when null/invalid, upload correctly defaults to current month. `onUploadSuccess` receives an attachment that includes `month`.
- **Attachments load/refetch:** Load effect and `onAttachmentRenamed` both pass `selectedMonth` (or `undefined` for "All months") to `getAttachments`; list stays in sync with selected month.
- **i18n (month selector):** `kpi.month`, `kpi.allMonths`, and `kpi.table.months.m1`…`m12` are used for the month dropdown in en/vi/zh.
- **No N+1:** One attachment list request per KPI record, unchanged from before; no extra round-trips for month.

---

## Security

- No new endpoints; existing KPI view/create permissions apply. Month is a filter/field only; validation (1–12) is done on client and server. No user input is rendered as HTML. No issues identified.

---

## Performance

- Attachment requests are per record and only when `canViewAttachments` is true. Month filter is applied in the API call (no client-side filtering of a large list). No performance concerns.

---

## Checklist vs `code-standards.md`

| Item | Status |
|------|--------|
| File naming (kebab-case) | OK |
| Component structure (props interface, "use client") | OK |
| Tailwind / ShadcnUI usage | OK |
| Optional params (month) conditional in API | OK |
| Error handling (try/catch, toast) | OK |
| No implicit any | OK |
| i18n for new UI (month labels) | OK; upload toasts still hardcoded |

---

## Verdict

**Approve with minor suggestions.** Phase 02 is ready to ship from a correctness and security perspective. Addressing i18n in the upload component and removing or gating debug logging will improve consistency and production hygiene; the other two items are optional cleanups.

---

## Follow-up (2026-01-30)

All suggestions implemented:

1. **i18n:** Added `boss.kpi.attachments` keys in en/vi/zh: `uploading`, `toastError`, `toastSuccess`, `pdfOnly`, `uploadSuccess`, `uploadFailed`. Component now uses `t()` for all toasts and labels.
2. **Debug logging:** Removed the development-only `console.log` block from `kpi-attachment-upload.tsx`.
3. **useEffect deps:** Removed `selectedMonth` from the department/auto-create effect dependency array in `page.tsx`; comment updated to "not on month change".
4. **uploadedBy:** Added inline comment: "API returns id, documentId, month, description, createdAt; fileName from file, uploadedBy not in response".

# Phase 04: Frontend Editing – Code Review

**Scope:** Phase 04 implementation (UserPicker, DatePickerField, IsoMetadataEditDialog, document-list edit action, API, i18n).  
**Checked against:** `./docs/code-standards.md`.

---

## Summary

Implementation matches the phase plan: ISO metadata edit dialog with level, preparer/reviewer/approver pickers and approval/receipt dates; API and i18n in place. No critical security or correctness issues. A few improvements recommended for consistency, accessibility, performance, and i18n.

---

## Critical Issues

**None.** No blocking bugs or security vulnerabilities identified.

---

## Suggestions

### 1. **Edit Metadata: gate by ability (document-list)**

- **Where:** `document-list.tsx` – Edit Metadata button.
- **What:** Other row actions (View, Download, Open to Edit, Version History) use `ability?.can("view" | "download" | "edit", ...)`. Edit Metadata is currently shown for every row with no permission check.
- **Suggestion:** Wrap the Edit Metadata button with the same document-level check used for “Open to Edit”, e.g. `ability?.can("edit", { id: doc.id, folderId: ... } as DocumentType)`, so only users who can edit the document can edit its ISO metadata.

### 2. **Rename button title i18n (document-list)**

- **Where:** `document-list.tsx` – Rename button `title="Rename"`.
- **What:** Hardcoded English string while other actions use `t("actions.*")`.
- **Suggestion:** Add `documents.list.actions.rename` (and vi/zh) and use `title={t("actions.rename")}` for consistency and i18n.

### 3. **UserPicker: i18n for “Loading…” and “No matches”**

- **Where:** `user-picker.tsx` – loading state text and empty-filter text.
- **What:** Strings are hardcoded; rest of app uses next-intl.
- **Suggestion:** Add `documents.editMetadata.loadingUsers` and `documents.editMetadata.noMatches` (and vi/zh), use `useTranslations("documents.editMetadata")` in UserPicker, and use those keys for loading and “No matches”. If UserPicker is reused outside documents, consider a generic namespace or optional `translations` prop.

### 4. **DatePickerField: stable `id` for Label/Input**

- **Where:** `date-picker-field.tsx` – `Label htmlFor={label}` and `Input id={label}`.
- **What:** Using `label` (translated text) as DOM id can cause duplicate ids if the same label is used twice in one form (e.g. two dialogs) and can break when label text changes (e.g. locale).
- **Suggestion:** Use React `useId()` (or an optional `id` prop) for the input id and pass it to both `Label htmlFor` and `Input id` so ids are unique and stable.

### 5. **UserPicker: avoid 3x user fetch when dialog opens**

- **Where:** `iso-metadata-edit-dialog.tsx` – three `<UserPicker>` instances.
- **What:** Each UserPicker mounts and calls `userApi.getAll(...)` in its own `useEffect`. Opening the dialog triggers three identical requests.
- **Suggestion (optional):** Either (a) fetch users once in IsoMetadataEditDialog and pass `users` (and loading state) into UserPicker via a prop, or (b) introduce a small `useUsers()` hook / module-level cache so the first UserPicker loads and the others reuse the same data. Reduces network and improves perceived performance.

### 6. **UserPicker: search by department array**

- **Where:** `user-picker.tsx` – `filtered` useMemo.
- **What:** Filter uses `u.department` (string). API `User` also has `departments?: Department[]`.
- **Suggestion:** If the list API returns `departments` and you want search by department name, extend the filter: e.g. `u.departments?.some((d) => d.name?.toLowerCase().includes(q))`. Low priority if current search is sufficient.

---

## Positive Feedback

- **Types:** Clear interfaces (`UserPickerProps`, `DatePickerFieldProps`, `IsoMetadataEditDialogProps`, `UpdateIsoMetadataDto`); props and API payloads are typed.
- **Structure:** Matches code-standards (feature components under `components/documents/`, ShadcnUI Dialog/Button/Input/Label), “use client” and component layout are consistent.
- **Error handling:** IsoMetadataEditDialog uses try/catch, toasts on success and error, and disables buttons while submitting.
- **Null/optional:** Level, preparer/reviewer/approver, and dates support “None”/clear; payload uses `undefined`/`null` appropriately for backend DTO.
- **Accessibility:** UserPicker uses `role="listbox"` and `role="option"`; DatePickerField associates label and input via `htmlFor`/`id` (improvement suggested above is about id uniqueness, not removal).
- **i18n:** Edit metadata dialog and list actions use `useTranslations` and document namespace; en/vi/zh keys added for editMetadata.
- **Security:** No `dangerouslySetInnerHTML`; user-controlled text is rendered as React children (escaped). Authorization for PATCH remains on backend; frontend only sends validated document id and DTO.

---

## Checklist (code-standards)

| Area                | Status                                                          |
| ------------------- | --------------------------------------------------------------- |
| File naming         | OK (kebab-case)                                                 |
| TypeScript types    | OK (explicit props and API types)                               |
| Component structure | OK (props interface, client components)                         |
| Error handling      | OK (toast, try/catch in dialog)                                 |
| Styling             | OK (Tailwind, ShadcnUI)                                         |
| i18n                | Minor: hardcoded “Rename”, UserPicker “Loading…” / “No matches” |

---

**Implemented (2026-01-30):** All 6 suggestions applied: (1) Edit Metadata gated by `ability?.can("edit", ...)`, (2) Rename button uses `t("actions.rename")` + keys en/vi/zh, (3) UserPicker uses `t("loadingUsers")` and `t("noMatches")`, (4) DatePickerField uses `useId()` for Label/Input id, (5) IsoMetadataEditDialog fetches users once and passes `users`/`usersLoading` to UserPickers, (6) UserPicker filter includes `u.departments?.some((d) => d.name?.toLowerCase().includes(q))`.

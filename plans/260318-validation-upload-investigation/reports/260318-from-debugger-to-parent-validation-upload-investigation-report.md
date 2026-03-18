# Investigation Report: Form Validation & Upload Error

**Date:** 260318  
**From:** debugger  
**To:** parent  
**Task:** Investigate form validation errors and multipart upload error

---

## Executive Summary

| Issue | Root Cause | Severity |
|------|------------|----------|
| **Issue 1** – "Please enter the full name (first name and last name)" validation | Misleading static helper text + possible UX confusion; no regex validation found | Medium |
| **Issue 2** – "Multipart: Malformed part header" | Busboy/multer parsing failure; likely boundary/stream corruption via Next.js proxy or busboy edge case | High |

---

## Issue 1 – Form Validation Errors (Orange Messages)

### Symptom

- "Select Folder" modal shows validation errors on Preparer, Reviewer, Approver fields
- Message: "Please enter the full name (first name and last name)"
- Names like "Nguyễn Văn Hưng", "Dong Ming Min", "Yang Ming" appear valid but trigger the error

### Investigation

**Validation logic:**

- **Location:** `apps/web/src/components/documents/folder-picker-dialog.tsx`
- **Logic:** `metadataComplete` (lines 162–169) requires:
  - `documentNo.trim()`, `preparerName.trim()`, `reviewerName.trim()`, `approverName.trim()`
  - `approvalDate`, `receiptDate`, `storageLocation.trim()`
- **Display:** `fullNameRequired` (lines 290, 304, 318) is shown as **static helper text** below each field, always visible, styled `text-amber-600 dark:text-amber-500`.

**Findings:**

1. No regex or pattern validation for names; only `trim()` is used.
2. Backend DTOs (`upload-document.dto.ts`, `update-iso-metadata.dto.ts`) use `@IsString()` only; no `@Matches()` or pattern.
3. Vietnamese names like "Nguyễn Văn Hưng" should pass `preparerName.trim()`.
4. The message "first name and last name" suggests two words, but the code does not enforce that.

### Root Cause

1. **UX confusion:** The orange text is always shown, so it looks like a validation error even when fields are valid.
2. **Misleading copy:** "first name and last name" implies exactly two words; Vietnamese names often have 3+ parts.
3. **Other required fields:** If the Select button stays disabled, it may be due to missing `documentNo`, `approvalDate`, `receiptDate`, or `storageLocation`, not the name fields.

### Recommended Fix

1. **Clarify helper text:** Change to something like "Enter full name (e.g. Nguyễn Văn A)" in `apps/web/messages/en/documents.json` (and vi/zh).
2. **Conditional display:** Show `fullNameRequired` only when the field is empty and the user has interacted with it (e.g. on blur or submit attempt).
3. **Optional:** Add explicit per-field validation errors (e.g. red text) instead of relying on the static helper.

---

## Issue 2 – Upload Error: "Multipart: Malformed part header"

### Symptom

- Error: "Multipart: Malformed part header"
- Occurs during document upload when user clicks Select in the modal
- Indicates multipart/form-data parsing failure

### Investigation

**Request flow:**

1. **Frontend:** `apps/web/src/app/[locale]/dashboard/documents/page.tsx` → `performUpload()` → `api.uploadWithProgress()`
2. **API client:** `apps/web/src/lib/api.ts` (lines 422–550)
   - Builds `FormData`: `file`, `fileName`, `folderId`, `levelId`, plus metadata (preparerName, reviewerName, approverName, etc.)
   - Uses `XMLHttpRequest` with `xhr.send(formData)`
   - Only sets `Authorization`; does not set `Content-Type` (correct for FormData)
3. **Proxy:** Next.js rewrites `/api/:path*` → `NEXT_PUBLIC_API_URL/api/:path*` (`next.config.mjs`)
4. **Backend:** `apps/api/src/modules/storage/controllers/document.controller.ts` (line 269)
   - `@UseInterceptors(FileInterceptor("file"), Utf8FileFixInterceptor)`
   - Multer (busboy) parses multipart before the controller runs

**Error source:**

- "Malformed part header" comes from **busboy** (used by multer)
- Busboy 1.6.0 is used (via multer 2.0.2)
- Known busboy issue: [mscdex/busboy#268](https://github.com/mscdex/busboy/issues/268) – header parsing state bug; some users still see it with 1.6.0

**Possible causes:**

1. **Next.js proxy:** Rewrites may alter or corrupt the multipart stream when proxying to the backend.
2. **Busboy edge case:** Header parser state bug with certain part orders or sizes.
3. **UTF-8 in field values:** Vietnamese characters in `preparerName`, `reviewerName`, `approverName` could affect part headers.
4. **Filename encoding:** Vietnamese characters in `file.name` in `Content-Disposition` (though `fileName` is sent as a separate text field).

### Root Cause

Most likely: **Next.js rewrites or busboy** causing multipart stream corruption. The error happens during parsing, before the controller, so the request body reaching NestJS is malformed.

### Recommended Fix

1. **Bypass proxy for uploads:** Call the API URL directly for uploads (e.g. `NEXT_PUBLIC_API_URL/storage/documents/upload`) instead of `/api/...`, to avoid Next.js proxy handling of the multipart body.
2. **Verify busboy/multer:** Check if upgrading multer (and thus busboy) or applying known patches helps.
3. **Debug:** Log raw `Content-Type` and `Content-Length` on the backend; capture a failing request (e.g. with browser DevTools) and replay it with curl to see if the backend receives a valid multipart body.
4. **Fallback:** If proxy is the cause, add a dedicated API route that streams the multipart body to the backend without modifying it.

---

## Supporting Evidence

### Key Files

| Purpose | Path |
|---------|------|
| Validation logic | `apps/web/src/components/documents/folder-picker-dialog.tsx` (162–174, 290, 304, 318) |
| Error message | `apps/web/messages/en/documents.json` (125) |
| FormData construction | `apps/web/src/lib/api.ts` (435–446) |
| Upload endpoint | `apps/api/src/modules/storage/controllers/document.controller.ts` (217–331) |
| Next.js proxy | `apps/web/next.config.mjs` (10–16) |
| Multer config | `apps/api/src/common/config/multer.config.ts` |

### Dependencies

- multer: 2.0.2  
- busboy: 1.6.0 (via multer)

---

## Unresolved Questions

1. Does the "Malformed part header" error occur for all uploads or only when metadata (e.g. Vietnamese names) is present?
2. Does the error occur when calling the API directly (no Next.js proxy)?
3. Is the validation issue purely UX (helper text) or is there a case where valid names still block the Select button?

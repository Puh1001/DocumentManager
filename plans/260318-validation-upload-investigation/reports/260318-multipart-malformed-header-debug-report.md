# Debug Report: Multipart "Malformed part header" (400 Bad Request)

**Date:** 260318  
**Request:** POST `/api/storage/documents/upload`  
**Error:** `Multipart: Malformed part header`  
**Status Code:** 400

---

## Problem Summary

Upload fails when file has non-ASCII filename (Chinese/Vietnamese). Busboy (used by Multer) fails to parse the multipart header.

| Field | Value |
|-------|-------|
| Request URL | `https://docs.bestpacific.vn/api/storage/documents/upload` |
| Content-Type | `multipart/form-data; boundary=----WebKitFormBoundaryiztZC9NKlBZDD8BD` |
| Content-Length | 244313 |
| Failing filename | `BPVN-DH-PR-005设备维修记录表 Bảng ghi chép sửa chữa thiết bị.pdf` |

---

## Root Cause (5 Whys)

1. **Why 400?** → Server returns 400 because busboy throws "Malformed part header" during multipart parsing.
2. **Why does busboy fail?** → Content-Disposition header contains raw UTF-8 bytes in `filename="..."` parameter.
3. **Why raw UTF-8?** → Browser uses `file.name` for the FormData file part; `file.name` is the raw filename.
4. **Why does that break parsing?** → RFC 2183/RFC 5987: non-ASCII filenames must use `filename*=UTF-8''encoded`. Raw UTF-8 in header can confuse busboy's header parser (byte-boundary, CRLF-like sequences).
5. **Why not caught earlier?** → No encoding validation on multipart uploads; ASCII-only filenames work.

**Root cause:** Non-ASCII filename in `Content-Disposition` (from `formData.append("file", file)`) causes busboy to fail with "Malformed part header".

---

## Evidence

### Request payload (first part)

```
------WebKitFormBoundaryiztZC9NKlBZDD8BD
Content-Disposition: form-data; name="file"; filename="BPVN-DH-PR-005设备维修记录表 Bảng ghi chép sửa chữa thiết bị.pdf"
Content-Type: application/pdf
```

The `filename` parameter contains:
- Chinese: 设备维修记录表
- Vietnamese: Bảng ghi chép sửa chữa thiết bị

### Error source

- **busboy** (via multer 2.0.2) throws "Malformed part header" during header parsing.
- Known busboy issue: [mscdex/busboy#268](https://github.com/mscdex/busboy/issues/268) – header parser state bug; fixed in 1.3.0 but some users still see it with 1.6.0.
- Non-ASCII in `filename` header is a separate cause: parser expects ASCII or RFC 5987 encoding.

### Backend already prefers `fileName` field

```typescript
// document.service.ts:465-468
const sourceFileName = fileName || file.originalname;
```

So the real filename is taken from `fileName` (body field) when present. The `file` part's `filename` in Content-Disposition is only used as fallback when `fileName` is missing.

---

## Fix Plan

**Use ASCII-only filename for the FormData file part.** Keep the real filename in the `fileName` text field (already sent).

**Implementation:**

1. In `apps/web/src/lib/api.ts` (uploadWithProgress), before `formData.append("file", file)`:
   - Create a safe filename: `document` + extension (e.g. `document.pdf`).
   - Use `new File([file], safeName, { type: file.type })` for the multipart part.
   - Continue sending `formData.append("fileName", file.name)` for the real filename.

2. Result: Content-Disposition will have `filename="document.pdf"` (ASCII only), and the backend uses `fileName` from the body when available.

---

## Verification

**Before fix:** Upload file with Vietnamese/Chinese filename → 400 "Malformed part header".  
**After fix:** Same upload → 200; document stored with correct filename from `fileName` field.

---

## Unresolved Questions

1. Does the error occur when calling the API directly (no Next.js proxy)? If not, proxy may also contribute.
2. Does the error occur for all non-ASCII filenames or only certain combinations?

# Phase 1: Verify All Upload Paths Use Encoding Fix

## Goal
Ensure all file upload paths use `fixFileNameEncoding()` before saving to database.

## Analysis

### Upload Paths Found:

1. **Document Upload (Regular)**
   - File: `apps/api/src/modules/storage/services/document.service.ts`
   - Line 83: ✅ `const fileName = fixFileNameEncoding(file.originalname);`
   - Status: **FIXED**

2. **KPI Attachment Upload**
   - File: `apps/api/src/modules/kpi/services/kpi-attachment.service.ts`
   - Line 70: Uses `file.originalname` for extension check only (OK)
   - Line 90: Calls `documentService.upload()` which has fix
   - Status: **FIXED** (via documentService)

3. **Document Sync (File System)**
   - File: `apps/api/src/modules/storage/handlers/document-sync.handler.ts`
   - Line 55: ✅ `const fixedFileName = fixFileNameEncoding(file.name);`
   - Status: **FIXED**

## Conclusion

✅ **All upload paths are protected with encoding fix.**

No additional changes needed.

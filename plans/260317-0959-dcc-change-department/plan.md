# DCC Change Department Feature

**Date:** 2026-03-17  
**Requirement:** Allow DCC to change document department after upload (fix wrong department selection).

## Overview

- Document department is derived from its folder (Folder.departmentId)
- Changing department = moving document to folder in target department
- Only DCC and admin can perform this action

## Phases

### Phase 01: Backend API
- Add `PATCH /storage/documents/:id/department` with body `{ folderId: string }`
- DCC/admin only; validate target folder under ISO_documents
- Move current file + version files physically on SMB
- Update document.folderId, document.filePath, version records
- Audit log

### Phase 02: Frontend
- Add ChangeDepartmentDialog (department selector + folder picker)
- Add "Change Department" action in document list (DCC/admin only)
- Wire to new API

### Phase 03: i18n & Tests
- Add translations (EN, VI, ZH)
- Backend unit/integration tests
- Run full test suite

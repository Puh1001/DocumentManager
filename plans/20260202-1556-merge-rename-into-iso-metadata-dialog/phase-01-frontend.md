## Phase 01 - Frontend merge rename into ISO metadata dialog

### Tasks

- Update `apps/web/src/components/documents/iso-metadata-edit-dialog.tsx`
  - Add `name` state (default from `doc.name`)
  - Add Input field for document name (with filename hint showing extension)
  - In `handleSave`, if name changed:
    - Call `documentApi.rename(doc.id, { name, fileName: name + ext })`
  - Then call `documentApi.updateIsoMetadata(...)`
  - Use toast + disable submit while saving

- Update `apps/web/src/components/documents/document-list.tsx`
  - Remove `RenameDocumentDialog` usage/state/button
  - Rename action should be performed via metadata dialog (keep one entrypoint)

### Acceptance checks

- User can đổi tên trong dialog metadata ISO và bấm Lưu.
- Tên hiển thị trong list được refresh qua `onSaved()` callback.

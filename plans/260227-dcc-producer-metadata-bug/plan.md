## Context

- **Bug**: DCC users (and other editors) cannot see or edit the ISO document **Preparer/Producer** field when opening the existing metadata edit dialog, even though:
  - Upload flow (`FolderPickerDialog`) already captures `preparerName` and sends it to the backend.
  - Backend DTO `UpdateIsoMetadataDto` already supports `preparerName`.
  - Document list UI already displays `preparerName` from the document payload.
- **Root cause**: `IsoMetadataEditDialog` currently only exposes `reviewerName`, `approverName`, dates, and `storageLocation` for editing; it neither renders a Preparer input nor binds `preparerName` in state/population or in the update payload.
- **Goal**: Align edit flow with upload + list flows so that any authorized editor (including DCC editing other departments' ISO docs) can **view and update `preparerName`** via the metadata edit dialog, and see the updated value reflected in list views.

## High-Level Approach

- **Reuse existing patterns** in `FolderPickerDialog` and translations (`documents.editMetadata.preparer*`) to add a Preparer field to `IsoMetadataEditDialog`.
- **Wire `preparerName` end-to-end**:
  - Read from `Document` type and initialize dialog state correctly (including fallback to related `preparer?.fullName` if present, mirroring reviewer/approver).
  - Include `preparerName` in the PATCH payload sent via `documentApi.updateIsoMetadata`, matching `UpdateIsoMetadataDto`.
- **Respect permissions**:
  - Keep existing `ability.can("edit", Document)` checks in `DocumentList` as the gate for opening the dialog; no extra per-field role branching needed unless future requirements change.
- **Validate** with local build, manual tests (especially DCC-like scenarios across departments), and quick regression check of upload metadata behavior.

## TODO Checklist

- [ ] **Review existing ISO metadata flow and list UI**
  - [ ] Confirm how `preparerName` and related user fields are populated in the document list (`DocumentList`, `Document` types, backend projection).
  - [ ] Verify that upload-time `preparerName` from `FolderPickerDialog` is already persisted and visible in the list for new documents.
  - [ ] Re-skim `UpdateIsoMetadataDto`, document service, and controller to ensure `preparerName` is handled symmetrically with `reviewerName`/`approverName`.

- [ ] **Update `IsoMetadataEditDialog` to support Preparer**
  - [ ] Add local state for `preparerName` mirroring `reviewerName` and `approverName`.
  - [ ] On dialog open, initialize `preparerName` from `doc.preparerName ?? doc.preparer?.fullName ?? ""` to handle both name-string and relation-based data.
  - [ ] Render a new Preparer input field in the dialog UI:
    - [ ] Place it alongside Reviewer and Approver for consistent layout.
    - [ ] Use existing i18n keys under `documents.editMetadata` (`preparer`, `preparerPlaceholder`, `fullNameRequired`) to avoid new translation keys.
  - [ ] Extend the `payload` in `handleSave` to include `preparerName: preparerName.trim() || null` so it matches `UpdateIsoMetadataDto`.
  - [ ] Keep validation rules aligned with current behavior (Document No + name required; Preparer stays optional but guided by helper text).

- [ ] **Ensure API contract alignment**
  - [ ] Double-check the frontend `UpdateIsoMetadataDto` type in `apps/web/src/lib/api.ts` includes `preparerName?: string | null` (already present) and remains compatible with the backend DTO.
  - [ ] Confirm there are no additional backend constraints (e.g., validation, permission policies) that would block DCC from updating `preparerName` when they can already edit ISO metadata.

- [ ] **Permission and role considerations for DCC**
  - [ ] Verify that DCC access to the edit dialog is governed by existing `ability.can("edit", Document)` checks in `DocumentList`.
  - [ ] Manually test editing ISO metadata as a DCC-like user on documents from **other departments** to ensure `preparerName` changes persist and are visible.
  - [ ] Note any future need for stricter ABAC rules (e.g., only DCC or owning department can change preparer) but **do not over-design** until requirements change (YAGNI).

- [ ] **Translations & UX polish**
  - [ ] Confirm that the Preparer label and placeholders are correctly localized in `en`, `vi`, and `zh` messages (reuse existing keys; no new strings expected).
  - [ ] Ensure layout of the new Preparer field keeps the dialog compact and readable on smaller screens (follow existing Tailwind/shadcn patterns).

- [ ] **Validation & Regression Testing**
  - [ ] **Build checks**
    - [ ] Run frontend type-check/lint/build (e.g., `npm run lint`, `npm run build` or workspace-equivalent) to ensure no TS or compile errors after dialog changes.
  - [ ] **Manual test scenarios**
    - [ ] Upload a new ISO document via `FolderPickerDialog` with **all metadata fields filled, including Preparer**, then:
      - [ ] Confirm the list view shows Preparer correctly.
      - [ ] Open the metadata edit dialog and verify the Preparer field is pre-populated with the saved value.
      - [ ] Change Preparer and save; verify the list updates accordingly after refresh.
    - [ ] For an existing document that already has `reviewerName`/`approverName` set but **no `preparerName`**:
      - [ ] Open the edit dialog, set Preparer, and save; confirm the value appears in the list and is persisted on reload.
    - [ ] Repeat the above as a user with DCC role editing documents from **another department**:
      - [ ] Confirm the Edit Metadata button is available.
      - [ ] Verify Preparer is visible/editable and changes persist.
  - [ ] **Regression checks**
    - [ ] Ensure reviewer/approver fields still behave as before (no regressions in validation, saving, or display).
    - [ ] Verify that leaving Preparer blank does not cause backend validation errors and that the list displays the placeholder correctly.

## Notes & Risks

- **Risk (low)**: If any consumers depend on `preparerName` being non-editable post-upload, this change could alter expectations; current behavior and DTO design strongly suggest it is meant to be editable like reviewer/approver.
- **Risk (low)**: DCC ABAC rules might evolve to differentiate which metadata fields they can modify; the current change assumes any user allowed to edit metadata may edit `preparerName` as well.

## Open Questions

- Should there be any stricter validation or formatting rules for `preparerName` (e.g., must match a known user list vs. free-text full name), or is the current free-text full-name approach sufficient?

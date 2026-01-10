# Researcher 02 - Frontend Boss KPI UI & Permissions

## Scope

- Boss dashboard KPI UI (Next.js)
- Existing PDF viewer & copy protection
- Mapping backend permissions to UI capabilities for view/download/print/copy

## Findings

### 1. Boss KPI UI

- Relevant files (from recent activity):
  - `apps/web/src/app/[locale]/dashboard/boss/page.tsx`
  - `apps/web/src/components/boss/kpi-list.tsx`
  - `apps/web/src/components/boss/department-kpi-status.tsx`
- UI already displays KPI rows with names and status; new requirement adds **"Attached file"** column with icon/buttons per KPI row to open PDFs.

### 2. Existing PDF Viewer

- Viewer components live under `apps/web/src/components/viewers/`.
- Current behavior:
  - Uses iframe-based PDF viewer.
  - Can disable right-click, selection, keyboard shortcuts via `useCopyProtection` hook.
  - Supports watermarks for sensitive docs.
- These mechanisms can be reused for KPI signed PDFs by routing through dedicated KPI attachment viewer route that internally streams via backend.

### 3. Permission Integration

- Frontend uses CASL via:
  - `useCanAccess(action, subject)` hook.
  - `PageGuard` and `pageMetadata` for page-level protections.
- For attachment buttons:
  - **View** icon/button visible only if user has `view` on `Kpi` (or dedicated subject) and backend confirms allowed for that attachment.
  - **Download** button gated by `useCanAccess('download', 'Kpi')`.
  - **Print** button gated by `useCanAccess('print', 'Kpi')`.
  - **Copy** (content) permission used to toggle `useCopyProtection` (if user lacks `copy`, enable protection + watermark).

### 4. UI Interaction Flow

- Boss dashboard lists KPI rows.
- Each row shows a compact list of attachments (chips with file name or `PDF` label).
- Clicking attachment:
  - Opens modal or routed page with embedded PDF.
  - Toolbar buttons: Close, Download, Print (conditioned by permissions).
- Boss role is read-only: cannot upload/edit; only view/download/print/copy based on granted permissions.

### 5. Edge Cases

- When user has view but not download: viewer shows PDF but hides download button; copy protection enabled.
- When user has view+download but not print: disable visible print button and attempt to block `Ctrl+P` (best-effort, cannot be perfect).
- When user has no permissions: hide attachment column or show lock icon with tooltip `No access`.

## Open Questions

- Should attachments also be discoverable in general document browser?
- Do we need per-user overrides (beyond role-based) for these four actions?
- Preferred UX for many attachments per KPI (truncate list with `+N more` vs scroll)?

# Phase 02 - Frontend Boss KPI UI & Viewer Integration

## Context Links

- Parent plan: `./plan.md`
- Dependencies: Phase 01 (Backend API must be complete)
- Research:
  - `./research/researcher-02-frontend-boss-kpi-ui.md`
- Docs:
  - `../../docs/codebase-summary.md`
  - `../../docs/code-standards.md`
  - `../../docs/system-architecture.md`
- Related files:
  - `apps/web/src/app/[locale]/dashboard/boss/page.tsx`
  - `apps/web/src/components/boss/kpi-list.tsx`
  - `apps/web/src/components/boss/department-kpi-status.tsx`
  - `apps/web/src/components/viewers/pdf-viewer.tsx`
  - `apps/web/src/hooks/use-can-access.ts`
  - `apps/web/src/hooks/use-copy-protection.ts`

## Overview

- **Date:** 2026-01-09
- **Priority:** High
- **Implementation Status:** ✅ Completed
- **Review Status:** Not reviewed
- **Description:** Add attachment display column to boss KPI UI, integrate PDF viewer with permission-aware controls (view/download/print/copy), and handle multiple attachments per KPI record.

## Key Insights

- Boss UI already displays KPI lists; need to add "Attached file" column showing PDF chips/icons.
- Existing PDF viewer (`pdf-viewer.tsx`) supports `canDownload` and `canPrint` props; extend to support `canCopy`.
- Copy protection hook (`useCopyProtection`) already exists; integrate with permission checks.
- Permission checks via `useCanAccess(action, subject)` hook; subject should be `Kpi` or new `KpiAttachment`.
- Multiple attachments per KPI: display as chips/badges with click-to-view modal or dedicated route.

## Requirements

### Functional

- Display attachment column in KPI list showing PDF file names/chips (max 3 visible, "+N more" if more).
- Clicking attachment opens PDF viewer modal or dedicated route.
- Viewer toolbar shows Download/Print buttons only if user has respective permissions.
- Copy protection enabled automatically if user lacks `copy` permission.
- Handle empty state (no attachments) gracefully.
- Support multiple attachments per KPI record (from Phase 01 backend).

### Non-Functional

- Reuse existing cyber-themed UI styling (cyber-button, cyber-card, cyber-neon-cyan).
- Maintain responsive design for mobile/tablet.
- Loading states during attachment fetch.
- Error handling for failed attachment loads.
- i18n support for all new UI text (Vietnamese, English, Chinese).

## Architecture

- **Component Structure:**
  - Extend `KpiList` component to fetch and display attachments per KPI row.
  - Create `KpiAttachmentList` component for rendering attachment chips.
  - Create `KpiAttachmentViewer` modal/page component wrapping `PdfViewer` with permission-aware toolbar.
  - Extend `KpiDetail` component (if exists) to show attachments section.

- **Data Flow:**
  - `KpiList` fetches attachments via `GET /kpi/records/:id/attachments` for each visible KPI.
  - Attachment metadata includes `id`, `fileName`, `documentId`, `uploadedBy`, `createdAt`.
  - Viewer component calls `GET /kpi/attachments/:id/stream` for PDF content.
  - Download button calls `GET /kpi/attachments/:id/download` (only if `canDownload` true).

- **Permission Integration:**
  - Use `useCanAccess('view', 'Kpi')` to show/hide attachment column.
  - Use `useCanAccess('download', 'Kpi')` to show/hide download button.
  - Use `useCanAccess('print', 'Kpi')` to show/hide print button.
  - Use `useCanAccess('copy', 'Kpi')` to toggle `useCopyProtection` hook.

## Related Code Files

### To Modify

- `apps/web/src/components/boss/kpi-list.tsx` - Add attachment column and fetch logic
- `apps/web/src/components/boss/kpi-detail.tsx` (if exists) - Add attachments section
- `apps/web/src/components/viewers/pdf-viewer.tsx` - Add `canCopy` prop and integrate `useCopyProtection`
- `apps/web/src/lib/api.ts` - Add KPI attachment API methods
- `apps/web/src/lib/types/ability.types.ts` - Ensure `Kpi` or `KpiAttachment` subject exists

### To Create

- `apps/web/src/components/boss/kpi-attachment-list.tsx` - Component for rendering attachment chips
- `apps/web/src/components/boss/kpi-attachment-viewer.tsx` - Modal/page for PDF viewer with toolbar
- `apps/web/src/components/boss/kpi-attachment-upload.tsx` (optional, for non-boss users) - Upload UI component

## Implementation Steps

1. **API Client Extensions**
   1. Add `kpiAttachmentApi` methods in `apps/web/src/lib/api.ts`:
      - `getAttachments(kpiRecordId: string)` → `GET /kpi/records/:id/attachments`
      - `getAttachmentStreamUrl(attachmentId: string)` → `GET /kpi/attachments/:id/stream`
      - `downloadAttachment(attachmentId: string)` → `GET /kpi/attachments/:id/download`
   2. Add TypeScript interfaces for `KpiAttachment` response type.

2. **KpiAttachmentList Component**
   1. Create `apps/web/src/components/boss/kpi-attachment-list.tsx`.
   2. Props: `attachments: KpiAttachment[]`, `onAttachmentClick: (id: string) => void`, `canView: boolean`.
   3. Render chips/badges with PDF icon and file name.
   4. Show max 3 attachments, then "+N more" badge if more exist.
   5. Handle empty state (no attachments).
   6. Apply cyber-themed styling consistent with boss UI.

3. **KpiAttachmentViewer Component**
   1. Create `apps/web/src/components/boss/kpi-attachment-viewer.tsx`.
   2. Props: `attachmentId: string`, `fileName: string`, `onClose: () => void`.
   3. Fetch attachment stream URL on mount.
   4. Render `PdfViewer` component with permission-aware props:
      - `canDownload={useCanAccess('download', 'Kpi')}`
      - `canPrint={useCanAccess('print', 'Kpi')}`
      - `canCopy={useCanAccess('copy', 'Kpi')}` (new prop)
   5. Add toolbar with Close, Download, Print buttons (conditionally rendered).
   6. Integrate `useCopyProtection(!canCopy)` hook.
   7. Handle loading and error states.

4. **Extend PdfViewer Component**
   1. Add `canCopy?: boolean` prop to `PdfViewer` interface.
   2. Pass `canCopy` to `useCopyProtection` hook internally.
   3. Ensure copy protection disables right-click, Ctrl+C, text selection when `canCopy === false`.

5. **Update KpiList Component**
   1. Add state for attachments map: `Map<kpiId, KpiAttachment[]>`.
   2. Fetch attachments for each KPI record when list loads (or lazy-load on expand).
   3. Add "Attached file" column header (only if user has `view` permission).
   4. Render `KpiAttachmentList` in each KPI row.
   5. Handle click on attachment → open `KpiAttachmentViewer` modal or navigate to viewer route.

6. **Update KpiDetail Component** (if exists)
   1. Add attachments section showing all attachments for the KPI.
   2. Allow clicking to open viewer (same `KpiAttachmentViewer` component).

7. **i18n Translations**
   1. Add translations for:
      - `boss.kpi.attachments.title` → "Attached file"
      - `boss.kpi.attachments.noAttachments` → "No attachments"
      - `boss.kpi.attachments.moreFiles` → "+{count} more"
      - `boss.kpi.attachments.viewer.title` → "View PDF"
      - `boss.kpi.attachments.viewer.download` → "Download"
      - `boss.kpi.attachments.viewer.print` → "Print"
      - `boss.kpi.attachments.viewer.close` → "Close"
   2. Add to `apps/web/messages/en.json`, `vi.json`, `zh.json`.

8. **Permission Subject Type**
   1. Ensure `Kpi` or `KpiAttachment` exists in `apps/web/src/lib/types/ability.types.ts` Subjects union.
   2. If new subject needed, coordinate with Phase 03 to add backend support.

## Todo List

- [x] Add KPI attachment API methods to `api.ts`.
- [x] Create `KpiAttachmentList` component with chip rendering.
- [x] Create `KpiAttachmentViewer` modal/page component.
- [x] Extend `PdfViewer` to support `canCopy` prop.
- [x] Update `KpiList` to fetch and display attachments.
- [x] Update `KpiDetail` component (if exists) with attachments section.
- [x] Add i18n translations for all new UI text.
- [x] Test permission-based button visibility (view/download/print/copy).
- [x] Test copy protection when `canCopy === false`.
- [x] Test multiple attachments display (3+ files).

## Success Criteria

- Attachment column appears in KPI list (only if user has `view` permission).
- Multiple attachments per KPI display correctly (chips with "+N more").
- Clicking attachment opens viewer modal/page.
- Download/Print buttons only visible if user has respective permissions.
- Copy protection activates when user lacks `copy` permission.
- Empty state handled gracefully (no attachments).
- All UI text translated (i18n).
- Responsive design works on mobile/tablet.

## Risk Assessment

- **Risk:** Performance degradation if fetching attachments for many KPIs at once.
  - **Mitigation:** Lazy-load attachments on row expand or use pagination; consider caching.
- **Risk:** Copy protection can be bypassed by tech-savvy users (browser DevTools, screenshots).
  - **Mitigation:** Document limitations; add watermarking for sensitive PDFs (future enhancement).
- **Risk:** PDF viewer compatibility issues across browsers.
  - **Mitigation:** Test on Chrome, Firefox, Edge; provide fallback download link.

## Security Considerations

- Never expose file paths or internal IDs in UI (use attachment IDs only).
- Ensure all API calls include JWT token (handled by `api.ts` client).
- Frontend permission checks are UX only; backend enforces actual access.
- Copy protection is best-effort; sensitive documents should have watermarks.

## Next Steps

- Complete Phase 03 (Authorization & Permission Management) to ensure backend permission system supports KPI attachments.
- Add automated tests for attachment UI components (Phase 04).
- Consider adding upload UI for non-boss users (future enhancement).

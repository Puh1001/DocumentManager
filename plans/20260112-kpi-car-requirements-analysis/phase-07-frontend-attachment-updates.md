# Phase 7: Frontend Attachment Updates

**Parent Plan:** [plan.md](./plan.md)  
**Dependencies:** 
- [Phase 5: Frontend Form Updates](./phase-05-frontend-form-updates.md)
- [Phase 6: Frontend Conditional Logic](./phase-06-frontend-conditional-logic.md)  
**Status:** 🔲 Pending  
**Priority:** HIGH  
**Estimated Duration:** 2-3 hours

---

## Context Links

- [Analysis Document](./analysis.md) - Attachment requirements
- [Phase 6](./phase-06-frontend-conditional-logic.md) - Conditional logic
- [KpiAttachmentUpload](../../apps/web/src/components/boss/kpi-attachment-upload.tsx) - Current upload component
- [KpiAttachmentList](../../apps/web/src/components/boss/kpi-attachment-list.tsx) - Attachment list component

---

## Overview

Update attachment upload components to support attachment types (KPI_EVIDENCE vs CAR) and implement conditional CAR PDF upload requirement. Separate upload sections for KPI Evidence and CAR PDFs.

**Date:** 2026-01-12  
**Priority:** HIGH  
**Implementation Status:** 🔲 Pending  
**Review Status:** 🔲 Pending

---

## Key Insights

- Current `KpiAttachmentUpload` component needs `attachmentType` prop
- Need separate upload sections for KPI Evidence and CAR PDF
- CAR PDF upload should only show if status = "Not achieved"
- KPI Evidence PDF is always required
- Need to filter attachments by type in list view

---

## Requirements

### Functional Requirements

1. **Attachment Type Support:**
   - Add `attachmentType` prop to upload component
   - Pass `attachmentType` to API when uploading
   - Filter attachments by type in list view

2. **Separate Upload Sections:**
   - KPI Evidence PDF section (always visible, always required)
   - CAR PDF section (conditional, visible only if status = "Not achieved")

3. **Validation:**
   - KPI Evidence PDF: Required (always)
   - CAR PDF: Required if status = "Not achieved"
   - Show validation errors if PDFs missing

4. **Display:**
   - Separate lists for KPI Evidence and CAR PDFs
   - Clear labels indicating attachment type
   - Visual indicators for required vs optional

### Non-Functional Requirements

- Consistent with existing upload component style
- i18n support
- Accessible
- Clear user feedback

---

## Architecture

### Component Structure

```tsx
// In KPI form/page
<div className="space-y-6">
  {/* KPI Evidence PDF - Always required */}
  <div>
    <Label>
      KPI Evidence PDF <span className="text-destructive">*</span>
      <span className="text-sm text-muted-foreground ml-2">(必传)</span>
    </Label>
    <KpiAttachmentUpload
      kpiRecordId={recordId}
      attachmentType="KPI_EVIDENCE"
      required
      onUploadSuccess={handleEvidenceUpload}
    />
    <KpiAttachmentList
      kpiRecordId={recordId}
      attachmentType="KPI_EVIDENCE"
      attachments={evidenceAttachments}
    />
    {errors.kpiEvidence && (
      <p className="text-sm text-destructive mt-1">
        {errors.kpiEvidence}
      </p>
    )}
  </div>

  {/* CAR PDF - Conditional, required if status = NOT_ACHIEVED */}
  {status === 'NOT_ACHIEVED' && (
    <div className="animate-in fade-in slide-in-from-top-2">
      <Label>
        CAR PDF <span className="text-destructive">*</span>
        <span className="text-sm text-muted-foreground ml-2">(不达标必传)</span>
      </Label>
      <KpiAttachmentUpload
        kpiRecordId={recordId}
        attachmentType="CAR"
        required
        onUploadSuccess={handleCarUpload}
      />
      <KpiAttachmentList
        kpiRecordId={recordId}
        attachmentType="CAR"
        attachments={carAttachments}
      />
      {errors.carPdf && (
        <p className="text-sm text-destructive mt-1">
          {errors.carPdf}
        </p>
      )}
    </div>
  )}
</div>
```

### Updated Upload Component

```tsx
interface KpiAttachmentUploadProps {
  kpiRecordId: string;
  folderId?: string;
  attachmentType: 'KPI_EVIDENCE' | 'CAR';
  required?: boolean;
  onUploadSuccess: (attachment: KpiAttachment) => void;
  variant?: 'default' | 'cyber';
}

export function KpiAttachmentUpload({
  kpiRecordId,
  folderId,
  attachmentType,
  required = false,
  onUploadSuccess,
  variant = 'default',
}: KpiAttachmentUploadProps) {
  // ... existing upload logic ...
  
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    // ... file validation ...
    
    const result = await kpiAttachmentApi.uploadAttachment(
      kpiRecordId,
      file,
      folderId,
      undefined, // description
      attachmentType // NEW: pass attachment type
    );
    
    // ... handle success ...
  };
}
```

### API Client Update

```typescript
// In api.ts
export const kpiAttachmentApi = {
  uploadAttachment: (
    kpiRecordId: string,
    file: File,
    folderId: string | undefined,
    description?: string,
    attachmentType?: 'KPI_EVIDENCE' | 'CAR' // NEW
  ) =>
    api.upload(`/kpi/records/${kpiRecordId}/attachments`, file, {
      ...(folderId && folderId.trim() !== '' && { folderId }),
      ...(description && { description }),
      ...(attachmentType && { attachmentType }), // NEW
    }),
};
```

---

## Related Code Files

### Files to Modify

- `apps/web/src/components/boss/kpi-attachment-upload.tsx`
  - Add `attachmentType` prop
  - Pass `attachmentType` to API

- `apps/web/src/components/boss/kpi-attachment-list.tsx`
  - Filter by `attachmentType` if needed
  - Display attachment type badge

- `apps/web/src/lib/api.ts`
  - Update `uploadAttachment` to accept `attachmentType`
  - Update `KpiAttachment` interface

- `apps/web/src/app/[locale]/dashboard/kpi/page.tsx`
  - Add separate upload sections
  - Add conditional CAR PDF section
  - Add validation for PDFs

### Files to Review

- `apps/web/src/components/boss/kpi-attachment-viewer.tsx` - May need updates

---

## Implementation Steps

1. **Update KpiAttachmentUpload Component**
   - Add `attachmentType` prop
   - Pass `attachmentType` to API call
   - Update component interface

2. **Update API Client**
   - Add `attachmentType` parameter to `uploadAttachment`
   - Include in request body

3. **Update KPI Page/Form**
   - Add KPI Evidence PDF section (always visible)
   - Add CAR PDF section (conditional)
   - Separate attachment lists by type
   - Add validation for required PDFs

4. **Update Attachment List Component**
   - Filter by `attachmentType` if needed
   - Display type badge/label
   - Separate sections for different types

5. **Add Validation**
   - Check KPI Evidence PDF exists (always)
   - Check CAR PDF exists (if status = NOT_ACHIEVED)
   - Show validation errors

6. **Add Translations**
   - Add labels for attachment types
   - Add validation messages
   - Add tooltips/help text

7. **Test Upload Flow**
   - Test KPI Evidence upload
   - Test CAR PDF upload (conditional)
   - Test validation errors
   - Test attachment list filtering

---

## Todo List

- [ ] Update KpiAttachmentUpload with attachmentType prop
- [ ] Update API client to accept attachmentType
- [ ] Add KPI Evidence PDF section to form
- [ ] Add conditional CAR PDF section to form
- [ ] Update attachment list to filter by type
- [ ] Add validation for required PDFs
- [ ] Add translations for attachment types
- [ ] Test upload flows
- [ ] Test conditional visibility
- [ ] Test validation errors

---

## Success Criteria

- [ ] KPI Evidence PDF upload works
- [ ] CAR PDF upload works (conditional)
- [ ] Attachment types stored correctly
- [ ] Separate sections display correctly
- [ ] Validation works for required PDFs
- [ ] Attachment lists filter by type
- [ ] Translations added
- [ ] All upload scenarios tested

---

## Risk Assessment

### Potential Issues

1. **Attachment type not passed correctly**
   - Mitigation: Verify API call includes attachmentType
   - Verification: Check network requests

2. **Conditional section not showing/hiding**
   - Mitigation: Test status change scenarios
   - Verification: Manual testing

3. **Validation not working**
   - Mitigation: Test all validation scenarios
   - Verification: Test with/without PDFs

---

## Security Considerations

- No new security vulnerabilities
- File upload validation remains (PDF only)
- Existing permission checks remain

---

## Next Steps

- **Dependency:** Phases 5 and 6 must be complete
- **Follow-up:** Phase 8 - Testing & Validation
- **Blockers:** None if dependencies complete

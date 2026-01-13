# KPI/CAR Requirements Analysis

**Date:** 2026-01-12  
**Status:** 🔍 Analysis Complete  
**Priority:** HIGH

---

## Executive Summary

Customer has provided a new field specification for KPI/CAR management that significantly expands the current implementation. The new requirements introduce:
- **Statistical Cycle** (Month/Quarter/Year)
- **KPI Status** (Achieved/Not achieved) with conditional fields
- **CAR (Corrective Action Request)** workflow with status and PDF attachments
- **Mandatory PDF uploads** for KPI Evidence (always required) and CAR (conditionally required)

This analysis compares current implementation with new requirements and identifies gaps, changes needed, and implementation considerations.

---

## Requirements Comparison

### Field-by-Field Analysis

| Field | Current Implementation | New Requirement | Gap Analysis |
|-------|------------------------|-----------------|--------------|
| **KPI Name** | ✅ `KpiRecord.title` (String) | Text, Mandatory | ✅ **Match** - Already implemented |
| **Department** | ✅ `KpiRecord.departmentId` (FK) | Dropdown, Mandatory | ✅ **Match** - Already implemented |
| **Year** | ✅ `KpiRecord.year` (Int) | Dropdown, Mandatory | ✅ **Match** - Already implemented |
| **Statistical Cycle** | ❌ **Missing** | Dropdown (Month/Quarter/Year), Mandatory | 🔴 **Gap** - Not implemented |
| **KPI Status** | ❌ **Missing** | Dropdown (Achieved/Not achieved), Mandatory | 🔴 **Gap** - Not implemented |
| **KPI Evidence PDF** | ⚠️ `KpiAttachment` (optional) | Attachment, **Mandatory upload** | 🟡 **Partial** - Exists but not mandatory |
| **Non-conformance Item** | ❌ **Missing** | Text, Mandatory if not achieved | 🔴 **Gap** - Not implemented |
| **CAR Status** | ❌ **Missing** | Dropdown (Open/In progress/Closed), Mandatory if not achieved | 🔴 **Gap** - Not implemented |
| **CAR PDF** | ❌ **Missing** | Attachment, Mandatory if not achieved | 🔴 **Gap** - Not implemented |

---

## Detailed Gap Analysis

### 1. Statistical Cycle (统计周期)

**Requirement:**
- Type: Dropdown
- Options: Month / Quarter / Year
- Control: Mandatory

**Current State:**
- Not implemented
- Current system tracks monthly metrics (`KpiMetric.values` with `m1-m12` keys)

**Impact:**
- Need to add `statisticalCycle` field to `KpiRecord` model
- May affect how metrics are displayed/calculated
- UI needs dropdown selection

**Implementation Considerations:**
- Add enum: `StatisticalCycle { MONTH, QUARTER, YEAR }`
- Add field: `statisticalCycle StatisticalCycle @default(MONTH)`
- Update DTOs and validation
- Update UI to show cycle selector

---

### 2. KPI Status (KPI状态)

**Requirement:**
- Type: Dropdown
- Options: Achieved / Not achieved
- Control: Mandatory

**Current State:**
- Not implemented
- System calculates completion based on metrics data, but no explicit status field

**Impact:**
- Need to add `status` field to `KpiRecord` model
- Triggers conditional fields (Non-conformance Item, CAR Status, CAR PDF)
- Affects validation logic

**Implementation Considerations:**
- Add enum: `KpiStatus { ACHIEVED, NOT_ACHIEVED }`
- Add field: `status KpiStatus` (mandatory)
- Update DTOs with validation
- Update UI with status dropdown
- Implement conditional field logic

---

### 3. KPI Evidence PDF (KPI证据PDF)

**Requirement:**
- Type: Attachment
- Control: **Mandatory upload** (必传)

**Current State:**
- ✅ `KpiAttachment` model exists
- ✅ Upload/view/delete functionality implemented
- ⚠️ **Not mandatory** - Currently optional

**Impact:**
- Need to enforce mandatory upload validation
- Frontend: Disable save/submit if no PDF uploaded
- Backend: Validate at least one attachment exists before allowing record completion

**Implementation Considerations:**
- Add validation in `CreateKpiRecordDto` or `UpdateKpiRecordDto`
- Add validation in service layer
- Update UI to show required indicator and validation error
- Consider: Should validation happen on create or on status change to "Achieved"?

---

### 4. Non-conformance Item (不符合项)

**Requirement:**
- Type: Text
- Control: Mandatory **if KPI Status = "Not achieved"**

**Current State:**
- Not implemented

**Impact:**
- Need to add `nonConformanceItem` field to `KpiRecord` model
- Conditional validation based on `status`
- UI needs conditional field display

**Implementation Considerations:**
- Add field: `nonConformanceItem String?` (nullable, but validated conditionally)
- Add conditional validation: `@ValidateIf((o) => o.status === KpiStatus.NOT_ACHIEVED)`
- Update DTOs
- Update UI to show/hide based on status selection

---

### 5. CAR Status (CAR状态)

**Requirement:**
- Type: Dropdown
- Options: Open / In progress / Closed
- Control: Mandatory **if KPI Status = "Not achieved"**

**Current State:**
- Not implemented

**Impact:**
- Need to add `carStatus` field to `KpiRecord` model
- Conditional validation based on `status`
- UI needs conditional field display

**Implementation Considerations:**
- Add enum: `CarStatus { OPEN, IN_PROGRESS, CLOSED }`
- Add field: `carStatus CarStatus?` (nullable, but validated conditionally)
- Add conditional validation
- Update DTOs
- Update UI to show/hide based on status selection

---

### 6. CAR PDF (CAR PDF)

**Requirement:**
- Type: Attachment
- Control: Mandatory **if KPI Status = "Not achieved"** (不达标必传)

**Current State:**
- Not implemented
- Current `KpiAttachment` model doesn't distinguish between KPI Evidence PDF and CAR PDF

**Impact:**
- Need to distinguish attachment types
- Need conditional validation for CAR PDF upload
- May need to extend `KpiAttachment` model or create separate model

**Implementation Considerations:**
- **Option A**: Add `attachmentType` enum to `KpiAttachment`:
  ```prisma
  enum AttachmentType {
    KPI_EVIDENCE  // KPI证据PDF
    CAR           // CAR PDF
  }
  ```
- **Option B**: Create separate `CarAttachment` model
- **Option C**: Use `description` field to tag attachments (not recommended - too fragile)
- **Recommendation**: Option A - Add `attachmentType` enum to existing model
- Add conditional validation: CAR PDF required if status = NOT_ACHIEVED
- Update UI to show separate upload sections for KPI Evidence and CAR PDF

---

## Database Schema Changes Required

### New Enums

```prisma
enum StatisticalCycle {
  MONTH   // 月度
  QUARTER // 季度
  YEAR    // 年度
}

enum KpiStatus {
  ACHIEVED     // 达标
  NOT_ACHIEVED // 不达标
}

enum CarStatus {
  OPEN         // 开启
  IN_PROGRESS  // 进行中
  CLOSED       // 关闭
}

enum AttachmentType {
  KPI_EVIDENCE // KPI证据PDF
  CAR          // CAR PDF
}
```

### KpiRecord Model Changes

```prisma
model KpiRecord {
  // ... existing fields ...
  
  // NEW FIELDS
  statisticalCycle    StatisticalCycle @default(MONTH) @map("statistical_cycle")
  status              KpiStatus       // Mandatory
  nonConformanceItem  String?          @map("non_conformance_item") // Mandatory if status = NOT_ACHIEVED
  carStatus           CarStatus?       @map("car_status") // Mandatory if status = NOT_ACHIEVED
  
  // ... rest of model ...
}
```

### KpiAttachment Model Changes

```prisma
model KpiAttachment {
  // ... existing fields ...
  
  // NEW FIELD
  attachmentType      AttachmentType @default(KPI_EVIDENCE) @map("attachment_type")
  
  // ... rest of model ...
}
```

---

## API Changes Required

### DTO Updates

#### CreateKpiRecordDto

```typescript
export class CreateKpiRecordDto {
  // ... existing fields ...
  
  @ApiProperty({ enum: StatisticalCycle, default: StatisticalCycle.MONTH })
  @IsEnum(StatisticalCycle)
  @IsNotEmpty()
  statisticalCycle: StatisticalCycle;
  
  @ApiProperty({ enum: KpiStatus })
  @IsEnum(KpiStatus)
  @IsNotEmpty()
  status: KpiStatus;
  
  @ApiProperty({ required: false })
  @ValidateIf((o) => o.status === KpiStatus.NOT_ACHIEVED)
  @IsString()
  @IsNotEmpty()
  nonConformanceItem?: string;
  
  @ApiProperty({ enum: CarStatus, required: false })
  @ValidateIf((o) => o.status === KpiStatus.NOT_ACHIEVED)
  @IsEnum(CarStatus)
  @IsNotEmpty()
  carStatus?: CarStatus;
}
```

#### UpdateKpiRecordDto

Same fields as CreateKpiRecordDto, but all optional (for partial updates).

#### CreateKpiAttachmentDto

```typescript
export class CreateKpiAttachmentDto {
  // ... existing fields ...
  
  @ApiProperty({ enum: AttachmentType, default: AttachmentType.KPI_EVIDENCE })
  @IsEnum(AttachmentType)
  @IsOptional()
  attachmentType?: AttachmentType; // Defaults to KPI_EVIDENCE for backward compatibility
}
```

### Validation Logic

#### Backend Service Validation

```typescript
// In KpiRecordService.create() or update()
async validateKpiRecord(data: CreateKpiRecordDto | UpdateKpiRecordDto) {
  // 1. If status = ACHIEVED, require at least one KPI_EVIDENCE attachment
  if (data.status === KpiStatus.ACHIEVED) {
    const hasEvidence = await this.checkHasEvidenceAttachment(recordId);
    if (!hasEvidence) {
      throw new BadRequestException('KPI Evidence PDF is mandatory when status is Achieved');
    }
  }
  
  // 2. If status = NOT_ACHIEVED, require:
  //    - nonConformanceItem
  //    - carStatus
  //    - CAR PDF attachment
  if (data.status === KpiStatus.NOT_ACHIEVED) {
    if (!data.nonConformanceItem) {
      throw new BadRequestException('Non-conformance Item is mandatory when status is Not achieved');
    }
    if (!data.carStatus) {
      throw new BadRequestException('CAR Status is mandatory when status is Not achieved');
    }
    const hasCarPdf = await this.checkHasCarAttachment(recordId);
    if (!hasCarPdf) {
      throw new BadRequestException('CAR PDF is mandatory when status is Not achieved');
    }
  }
}
```

---

## Frontend Changes Required

### Form Updates

#### KPI Record Form

1. **Add Statistical Cycle Dropdown**
   ```tsx
   <Select name="statisticalCycle" required>
     <option value="MONTH">Month</option>
     <option value="QUARTER">Quarter</option>
     <option value="YEAR">Year</option>
   </Select>
   ```

2. **Add KPI Status Dropdown**
   ```tsx
   <Select name="status" required onChange={handleStatusChange}>
     <option value="ACHIEVED">Achieved</option>
     <option value="NOT_ACHIEVED">Not achieved</option>
   </Select>
   ```

3. **Conditional Fields (Non-conformance Item, CAR Status)**
   ```tsx
   {status === 'NOT_ACHIEVED' && (
     <>
       <Input name="nonConformanceItem" required />
       <Select name="carStatus" required>
         <option value="OPEN">Open</option>
         <option value="IN_PROGRESS">In progress</option>
         <option value="CLOSED">Closed</option>
       </Select>
     </>
   )}
   ```

4. **Separate Upload Sections**
   ```tsx
   {/* KPI Evidence PDF - Always required */}
   <KpiAttachmentUpload
     kpiRecordId={recordId}
     attachmentType="KPI_EVIDENCE"
     required
     label="KPI Evidence PDF (必传)"
   />
   
   {/* CAR PDF - Required if status = NOT_ACHIEVED */}
   {status === 'NOT_ACHIEVED' && (
     <KpiAttachmentUpload
       kpiRecordId={recordId}
       attachmentType="CAR"
       required
       label="CAR PDF (不达标必传)"
     />
   )}
   ```

### Validation Updates

- Frontend validation before submit:
  - Check KPI Evidence PDF uploaded (always required)
  - If status = NOT_ACHIEVED:
    - Check Non-conformance Item filled
    - Check CAR Status selected
    - Check CAR PDF uploaded

---

## Migration Strategy

### Phase 1: Database Schema (Non-breaking)

1. Add new enums to schema
2. Add new fields as nullable (for backward compatibility)
3. Create migration
4. Deploy migration

### Phase 2: Backend API (Backward Compatible)

1. Update DTOs with optional new fields
2. Add validation logic
3. Update services
4. Deploy API

### Phase 3: Frontend (Gradual Rollout)

1. Update forms with new fields
2. Add conditional logic
3. Update attachment upload components
4. Deploy frontend

### Phase 4: Data Migration (If Needed)

1. Set default values for existing records:
   - `statisticalCycle = MONTH`
   - `status = ACHIEVED` (if metrics completed) or `NOT_ACHIEVED` (if incomplete)
   - Existing attachments → `attachmentType = KPI_EVIDENCE`

---

## Implementation Considerations

### 1. Backward Compatibility

- Existing records should have default values
- Existing attachments should default to `KPI_EVIDENCE` type
- API should accept requests without new fields (optional initially)

### 2. Validation Timing

**Question:** When should mandatory PDF validation occur?
- **Option A**: On record creation/update (strict)
- **Option B**: On status change to "Achieved" (flexible)
- **Option C**: On final submission/approval (most flexible)

**Recommendation:** Option B - Validate when status changes to "Achieved" or "Not achieved"

### 3. Attachment Type Migration

- Existing `KpiAttachment` records need `attachmentType` set
- Default to `KPI_EVIDENCE` for all existing records
- Users can manually update if needed

### 4. UI/UX Considerations

- Clear indication of mandatory vs optional fields
- Conditional field visibility (show/hide based on status)
- Separate sections for KPI Evidence PDF and CAR PDF
- Validation error messages in user's language

### 5. Performance

- No significant performance impact expected
- Additional validation queries may add minimal overhead
- Index on `attachmentType` if needed for filtering

---

## Success Metrics

- [ ] All new fields added to database schema
- [ ] All new fields visible in UI forms
- [ ] Conditional validation working correctly
- [ ] Mandatory PDF uploads enforced
- [ ] Existing records migrated with default values
- [ ] No breaking changes to existing functionality
- [ ] All translations added (EN, VI, ZH)

---

## Next Steps

1. **Review & Approval**: Get stakeholder approval on analysis
2. **Create Implementation Plan**: Break down into phases
3. **Database Migration**: Create Prisma migration
4. **Backend Implementation**: Update services, DTOs, validation
5. **Frontend Implementation**: Update forms, components, validation
6. **Testing**: Unit tests, integration tests, manual testing
7. **Deployment**: Staged rollout with monitoring

---

## Open Questions

1. **Statistical Cycle Impact**: How does cycle selection affect metric display/calculation?
   - If QUARTER: Show Q1, Q2, Q3, Q4 instead of months?
   - If YEAR: Show single annual value?

2. **Status Auto-calculation**: Should status be auto-calculated from metrics, or always manual?
   - Current system calculates "completion" from metrics
   - New requirement suggests manual status selection

3. **CAR Workflow**: Is CAR a separate workflow or part of KPI record?
   - Current analysis assumes CAR is part of KPI record
   - May need separate CAR management if workflow is complex

4. **Attachment Limits**: Any limits on number of attachments?
   - Multiple KPI Evidence PDFs allowed?
   - Multiple CAR PDFs allowed?

5. **Historical Data**: How to handle existing records without new fields?
   - Default values acceptable?
   - Require manual update?

---

## Conclusion

The new requirements significantly expand KPI management functionality with:
- **5 new fields** (Statistical Cycle, KPI Status, Non-conformance Item, CAR Status, Attachment Type)
- **Conditional validation** based on KPI Status
- **Mandatory PDF uploads** with conditional requirements
- **CAR workflow** integration

Implementation requires:
- Database schema changes (enums, fields)
- Backend validation logic updates
- Frontend form enhancements
- Migration strategy for existing data

**Estimated Effort:** 2-3 days for full implementation including testing.

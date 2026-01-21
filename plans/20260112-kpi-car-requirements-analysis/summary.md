# KPI/CAR Requirements Analysis - Summary

**Date:** 2026-01-12  
**Status:** ✅ Analysis Complete

---

## Quick Overview

Customer has provided new field specifications that expand KPI management with:

- **Statistical Cycle** selection (Month/Quarter/Year)
- **KPI Status** tracking (Achieved/Not achieved)
- **CAR (Corrective Action Request)** workflow
- **Mandatory PDF uploads** with conditional requirements

---

## Current vs New Requirements

### ✅ Already Implemented

- KPI Name (title)
- Department selection
- Year selection
- PDF attachments (basic functionality)

### 🔴 Missing - High Priority

1. **Statistical Cycle** - Dropdown (Month/Quarter/Year)
2. **KPI Status** - Dropdown (Achieved/Not achieved)
3. **Non-conformance Item** - Text field (conditional)
4. **CAR Status** - Dropdown (Open/In progress/Closed, conditional)
5. **CAR PDF** - Attachment type (conditional)
6. **Mandatory validation** for PDF uploads

### 🟡 Partial Implementation

- **KPI Evidence PDF**: Exists but not mandatory

---

## Key Changes Required

### Database Schema

- Add 4 new enums: `StatisticalCycle`, `KpiStatus`, `CarStatus`, `AttachmentType`
- Add 4 new fields to `KpiRecord`: `statisticalCycle`, `status`, `nonConformanceItem`, `carStatus`
- Add 1 new field to `KpiAttachment`: `attachmentType`

### Backend

- Update DTOs with new fields
- Add conditional validation logic
- Enforce mandatory PDF uploads based on status

### Frontend

- Add form fields for new data
- Implement conditional field display
- Separate upload sections for KPI Evidence and CAR PDF
- Add validation messages

---

## Implementation Approach

### Recommended: Phased Rollout

**Phase 1: Database (Non-breaking)**

- Add nullable fields
- Migrate existing data with defaults
- Duration: 1-2 hours

**Phase 2: Backend API**

- Update DTOs (optional fields initially)
- Add validation logic
- Duration: 4-6 hours

**Phase 3: Frontend**

- Update forms
- Add conditional logic
- Duration: 6-8 hours

**Total Estimated Time:** 2-3 days including testing

---

## Critical Decisions Needed

1. **Validation Timing**: When to enforce mandatory PDFs?
   - On record creation?
   - On status change?
   - On final submission?

2. **Statistical Cycle Impact**: How does cycle affect metric display?
   - QUARTER: Show Q1-Q4?
   - YEAR: Show annual value?

3. **Status Auto-calculation**: Manual selection or auto-calculate from metrics?

4. **Historical Data**: How to handle existing records without new fields?

---

## Next Steps

1. ✅ **Analysis Complete** - This document
2. 🔲 **Stakeholder Review** - Get approval on approach
3. 🔲 **Create Implementation Plan** - Detailed phase breakdown
4. 🔲 **Database Migration** - Schema changes
5. 🔲 **Backend Implementation** - Services, DTOs, validation
6. 🔲 **Frontend Implementation** - Forms, components
7. 🔲 **Testing & Deployment** - QA and rollout

---

## Files

- **Full Analysis**: `analysis.md` - Detailed field-by-field comparison, schema changes, API updates, implementation considerations
- **Summary**: `summary.md` - This document (high-level overview)

---

## Questions for Customer

1. Should Statistical Cycle affect how metrics are displayed (quarters vs months)?
2. Should KPI Status be auto-calculated from metrics or always manual?
3. Can there be multiple KPI Evidence PDFs or just one?
4. Can there be multiple CAR PDFs or just one?
5. What should happen to existing KPI records without these new fields?

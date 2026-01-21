# Phase 5: Frontend Form Updates

**Parent Plan:** [plan.md](./plan.md)  
**Dependencies:** 
- [Phase 4: Backend API Updates](./phase-04-backend-api-updates.md)  
**Status:** 🔲 Pending  
**Priority:** HIGH  
**Estimated Duration:** 3-4 hours

---

## Context Links

- [Analysis Document](./analysis.md) - UI requirements
- [Phase 4](./phase-04-backend-api-updates.md) - API endpoints
- [KPI Page](../../apps/web/src/app/[locale]/dashboard/kpi/page.tsx) - Current KPI form
- [Frontend Development Skill](../../.cursor/skills/frontend-development/SKILL.md) - Frontend patterns

---

## Overview

Update frontend forms to include new fields: Statistical Cycle, KPI Status, Non-conformance Item, and CAR Status. Add form controls with proper validation and user feedback.

**Date:** 2026-01-12  
**Priority:** HIGH  
**Implementation Status:** 🔲 Pending  
**Review Status:** 🔲 Pending

---

## Key Insights

- Form is in `apps/web/src/app/[locale]/dashboard/kpi/page.tsx`
- Uses React hooks for state management
- Needs dropdown components for enums
- Conditional fields should show/hide based on status
- Form validation should match backend validation

---

## Requirements

### Functional Requirements

1. **Add Form Fields:**
   - Statistical Cycle dropdown (Month/Quarter/Year)
   - KPI Status dropdown (Achieved/Not achieved)
   - Non-conformance Item text input (conditional)
   - CAR Status dropdown (conditional)

2. **Form Validation:**
   - Statistical Cycle: Required
   - KPI Status: Required
   - Non-conformance Item: Required if status = "Not achieved"
   - CAR Status: Required if status = "Not achieved"

3. **User Experience:**
   - Clear labels and placeholders
   - Required field indicators
   - Validation error messages
   - Conditional field visibility

### Non-Functional Requirements

- Responsive design
- Accessible (ARIA labels)
- i18n support (EN, VI, ZH)
- Consistent with existing form style

---

## Architecture

### Form Structure

```tsx
// Form fields structure
<Select name="statisticalCycle" required>
  <option value="MONTH">Month</option>
  <option value="QUARTER">Quarter</option>
  <option value="YEAR">Year</option>
</Select>

<Select name="status" required onChange={handleStatusChange}>
  <option value="ACHIEVED">Achieved</option>
  <option value="NOT_ACHIEVED">Not achieved</option>
</Select>

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

### State Management

```tsx
const [formData, setFormData] = useState({
  // ... existing fields ...
  statisticalCycle: 'MONTH',
  status: 'ACHIEVED',
  nonConformanceItem: '',
  carStatus: undefined,
});

const handleStatusChange = (newStatus: string) => {
  setFormData(prev => ({
    ...prev,
    status: newStatus,
    // Clear conditional fields if status changes to ACHIEVED
    ...(newStatus === 'ACHIEVED' && {
      nonConformanceItem: '',
      carStatus: undefined,
    }),
  }));
};
```

---

## Related Code Files

### Files to Modify

- `apps/web/src/app/[locale]/dashboard/kpi/page.tsx`
  - Add new form fields
  - Add state management for new fields
  - Add conditional rendering logic
  - Update form submission

- `apps/web/src/lib/api.ts`
  - Update `KpiRecord` interface to include new fields
  - Update API calls if needed

### Files to Create

- Translation keys in `apps/web/messages/{locale}/kpi.json`
  - Add translations for new fields

### Files to Review

- `apps/web/src/components/ui/select.tsx` - Select component
- `apps/web/src/components/ui/input.tsx` - Input component

---

## Implementation Steps

1. **Update TypeScript Interfaces**
   - Update `KpiRecord` interface in `page.tsx` or `api.ts`
   - Add new field types matching backend enums

2. **Add Form Fields to KPI Form**
   - Add Statistical Cycle dropdown
   - Add KPI Status dropdown
   - Add onChange handler for status
   - Add conditional fields (Non-conformance Item, CAR Status)

3. **Update Form State**
   - Add new fields to form state
   - Add handlers for field changes
   - Add conditional clearing logic

4. **Add Form Validation**
   - Add required validation for mandatory fields
   - Add conditional validation for conditional fields
   - Display validation errors

5. **Update Form Submission**
   - Include new fields in API request
   - Handle validation errors from backend
   - Show success/error messages

6. **Add Translations**
   - Add translation keys for new fields
   - Add translations for all locales (EN, VI, ZH)
   - Add validation error messages

7. **Update Form Display (Edit Mode)**
   - Load existing values for new fields
   - Handle nullable fields correctly
   - Show conditional fields if status = NOT_ACHIEVED

---

## Todo List

- [ ] Update KpiRecord TypeScript interface
- [ ] Add Statistical Cycle dropdown
- [ ] Add KPI Status dropdown
- [ ] Add status change handler
- [ ] Add conditional fields (Non-conformance Item, CAR Status)
- [ ] Add form validation
- [ ] Update form submission
- [ ] Add translations for new fields
- [ ] Test form create flow
- [ ] Test form edit flow
- [ ] Test conditional field visibility
- [ ] Test validation errors

---

## Success Criteria

- [ ] All new fields visible in form
- [ ] Conditional fields show/hide correctly
- [ ] Form validation works
- [ ] Form submission includes new fields
- [ ] Translations added for all locales
- [ ] Form works in both create and edit modes
- [ ] Validation errors display correctly
- [ ] Responsive design maintained

---

## Risk Assessment

### Potential Issues

1. **Form state management complexity**
   - Mitigation: Use clear state structure, test thoroughly
   - Verification: Test all state transitions

2. **Conditional field logic errors**
   - Mitigation: Add unit tests for conditional logic
   - Verification: Test all status change scenarios

3. **Translation keys missing**
   - Mitigation: Add all keys upfront, verify all locales
   - Verification: Test with different locales

---

## Security Considerations

- Client-side validation only (backend is source of truth)
- No new security vulnerabilities
- Input sanitization handled by backend

---

## Next Steps

- **Dependency:** Phase 4 must be complete (API ready)
- **Follow-up:** Phase 6 - Frontend Conditional Logic (enhances this phase)
- **Blockers:** None if Phase 4 complete

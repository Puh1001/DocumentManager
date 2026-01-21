# Phase 6: Frontend Conditional Logic

**Parent Plan:** [plan.md](./plan.md)  
**Dependencies:** 
- [Phase 5: Frontend Form Updates](./phase-05-frontend-form-updates.md)  
**Status:** 🔲 Pending  
**Priority:** HIGH  
**Estimated Duration:** 2-3 hours

---

## Context Links

- [Analysis Document](./analysis.md) - Conditional requirements
- [Phase 5](./phase-05-frontend-form-updates.md) - Form structure
- [KPI Page](../../apps/web/src/app/[locale]/dashboard/kpi/page.tsx) - Form implementation

---

## Overview

Implement sophisticated conditional logic for form fields and validation. Fields should show/hide, enable/disable, and validate based on KPI Status selection. Add real-time validation feedback.

**Date:** 2026-01-12  
**Priority:** HIGH  
**Implementation Status:** 🔲 Pending  
**Review Status:** 🔲 Pending

---

## Key Insights

- Conditional fields: Non-conformance Item, CAR Status, CAR PDF upload
- Validation should be real-time (on change, not just on submit)
- Clear visual indicators for required vs optional fields
- Smooth UX transitions when fields show/hide

---

## Requirements

### Functional Requirements

1. **Conditional Field Visibility:**
   - Show Non-conformance Item only if status = "Not achieved"
   - Show CAR Status only if status = "Not achieved"
   - Show CAR PDF upload only if status = "Not achieved"

2. **Conditional Validation:**
   - Validate Non-conformance Item only if visible
   - Validate CAR Status only if visible
   - Validate CAR PDF only if visible

3. **Field Clearing:**
   - Clear conditional fields when status changes to "Achieved"
   - Preserve values when status changes to "Not achieved" (if previously set)

4. **Visual Indicators:**
   - Required field asterisk (*)
   - Conditional required indicator
   - Validation error messages

### Non-Functional Requirements

- Smooth animations for show/hide
- Accessible (screen readers)
- Performance (no lag on status change)

---

## Architecture

### Conditional Rendering Logic

```tsx
const [status, setStatus] = useState<KpiStatus>('ACHIEVED');
const [showConditionalFields, setShowConditionalFields] = useState(false);

useEffect(() => {
  setShowConditionalFields(status === 'NOT_ACHIEVED');
  
  // Clear conditional fields if status changes to ACHIEVED
  if (status === 'ACHIEVED') {
    setFormData(prev => ({
      ...prev,
      nonConformanceItem: '',
      carStatus: undefined,
    }));
  }
}, [status]);

// In JSX
{showConditionalFields && (
  <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
    <div>
      <Label htmlFor="nonConformanceItem">
        Non-conformance Item <span className="text-destructive">*</span>
      </Label>
      <Input
        id="nonConformanceItem"
        value={formData.nonConformanceItem}
        onChange={(e) => handleFieldChange('nonConformanceItem', e.target.value)}
        required={status === 'NOT_ACHIEVED'}
      />
      {errors.nonConformanceItem && (
        <p className="text-sm text-destructive mt-1">
          {errors.nonConformanceItem}
        </p>
      )}
    </div>
    
    <div>
      <Label htmlFor="carStatus">
        CAR Status <span className="text-destructive">*</span>
      </Label>
      <Select
        id="carStatus"
        value={formData.carStatus || ''}
        onChange={(e) => handleFieldChange('carStatus', e.target.value)}
        required={status === 'NOT_ACHIEVED'}
      >
        <option value="">Select CAR Status</option>
        <option value="OPEN">Open</option>
        <option value="IN_PROGRESS">In progress</option>
        <option value="CLOSED">Closed</option>
      </Select>
      {errors.carStatus && (
        <p className="text-sm text-destructive mt-1">
          {errors.carStatus}
        </p>
      )}
    </div>
  </div>
)}
```

### Validation Logic

```tsx
const validateForm = (): boolean => {
  const newErrors: Record<string, string> = {};
  
  // Always required
  if (!formData.statisticalCycle) {
    newErrors.statisticalCycle = 'Statistical Cycle is required';
  }
  if (!formData.status) {
    newErrors.status = 'KPI Status is required';
  }
  
  // Conditionally required
  if (formData.status === 'NOT_ACHIEVED') {
    if (!formData.nonConformanceItem?.trim()) {
      newErrors.nonConformanceItem = 'Non-conformance Item is required when status is Not achieved';
    }
    if (!formData.carStatus) {
      newErrors.carStatus = 'CAR Status is required when status is Not achieved';
    }
  }
  
  setErrors(newErrors);
  return Object.keys(newErrors).length === 0;
};
```

---

## Related Code Files

### Files to Modify

- `apps/web/src/app/[locale]/dashboard/kpi/page.tsx`
  - Add conditional rendering logic
  - Add real-time validation
  - Add field clearing logic
  - Add visual indicators

### Files to Review

- `apps/web/src/components/ui/select.tsx` - Select component styling
- `apps/web/src/components/ui/input.tsx` - Input component styling

---

## Implementation Steps

1. **Add Conditional State Management**
   - Add `showConditionalFields` state
   - Add `useEffect` to update based on status
   - Add field clearing logic

2. **Implement Conditional Rendering**
   - Wrap conditional fields in conditional render
   - Add smooth transitions (CSS animations)
   - Ensure accessibility (aria-hidden when hidden)

3. **Add Real-time Validation**
   - Validate on field change
   - Validate on status change
   - Display errors immediately

4. **Add Visual Indicators**
   - Required field asterisks
   - Conditional required text
   - Error message styling
   - Success indicators

5. **Handle Form Submission**
   - Validate before submit
   - Clear conditional fields if not needed
   - Show validation errors if submit fails

6. **Test Conditional Logic**
   - Test status change to "Not achieved" (fields appear)
   - Test status change to "Achieved" (fields disappear, values cleared)
   - Test validation for conditional fields
   - Test form submission with/without conditional fields

---

## Todo List

- [ ] Add conditional state management
- [ ] Implement conditional rendering
- [ ] Add real-time validation
- [ ] Add visual indicators
- [ ] Add smooth transitions
- [ ] Handle field clearing
- [ ] Test status change scenarios
- [ ] Test validation scenarios
- [ ] Test accessibility
- [ ] Test performance

---

## Success Criteria

- [ ] Conditional fields show/hide correctly
- [ ] Fields clear when status changes to ACHIEVED
- [ ] Real-time validation works
- [ ] Visual indicators are clear
- [ ] Smooth transitions (no jarring)
- [ ] Accessible (screen readers work)
- [ ] No performance issues
- [ ] All edge cases handled

---

## Risk Assessment

### Potential Issues

1. **State management bugs (fields not clearing)**
   - Mitigation: Thorough testing, clear state logic
   - Verification: Test all state transitions

2. **Validation timing issues**
   - Mitigation: Validate on change and on submit
   - Verification: Test all validation scenarios

3. **Accessibility issues**
   - Mitigation: Use proper ARIA attributes
   - Verification: Test with screen reader

---

## Security Considerations

- No security impact
- Client-side validation only (backend is source of truth)

---

## Next Steps

- **Dependency:** Phase 5 must be complete
- **Follow-up:** Phase 7 - Frontend Attachment Updates (conditional CAR PDF)
- **Blockers:** None if Phase 5 complete

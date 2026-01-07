# Phase 4: Testing

**Parent Plan:** [plan.md](./plan.md)  
**Dependencies:** Phase 3 (Frontend)  
**Status:** 🔲 Pending  
**Priority:** Medium

---

## Overview

Test both PERCENTAGE and COUNT table types end-to-end.

## Test Scenarios

### 1. Create COUNT Table

- [ ] Select COUNT displayType when adding table
- [ ] Verify only TARGET and ACTUAL rows appear
- [ ] Enter values in both rows
- [ ] Verify chart shows actual counts (not percentages)
- [ ] Verify target line displays correctly

### 2. Create PERCENTAGE Table

- [ ] Select PERCENTAGE displayType (or default)
- [ ] Verify TARGET, ACTUAL, CALCULATED rows appear
- [ ] Enter values
- [ ] Verify efficiency calculations work
- [ ] Verify chart shows percentages

### 3. Edit Existing Tables

- [ ] Edit existing PERCENTAGE table (should work as before)
- [ ] Edit COUNT table values
- [ ] Verify changes persist after save

### 4. Export

- [ ] Export COUNT table to Excel
- [ ] Export PERCENTAGE table to Excel
- [ ] Verify both export correctly

### 5. Year Selector

- [ ] Switch years with COUNT tables
- [ ] Switch years with PERCENTAGE tables
- [ ] Verify correct data loads

### 6. Department Selector

- [ ] Switch departments with mixed table types
- [ ] Verify correct tables load

### 7. Edge Cases

- [ ] Empty tables (no data)
- [ ] Partial data (some months filled)
- [ ] Large values in COUNT tables
- [ ] Mixed departments (some with COUNT, some with PERCENTAGE)

## Success Criteria

- [ ] All test scenarios pass
- [ ] No console errors
- [ ] Charts render correctly for both types
- [ ] Data persists correctly
- [ ] No regressions in existing features

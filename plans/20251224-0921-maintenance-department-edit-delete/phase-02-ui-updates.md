# Phase 2: Form & UI Updates

**Parent Plan:** [plan.md](./plan.md)  
**Status:** 🔲 Pending  
**Priority:** High

---

## Overview

Add department selector to form, edit/delete buttons to notice list, and edit mode functionality.

## Requirements

1. Department dropdown in form (fetch from API)
2. Edit button on each notice card
3. Delete button on each notice card
4. Edit mode: populate form when editing
5. Show department name in notice list
6. Confirmation dialog for delete

## Architecture

### Form Updates

- Add department selector dropdown
- Add edit mode state
- Populate form when editing
- Clear form after save/cancel

### Notice List Updates

- Show department name (or "All Departments")
- Add Edit button
- Add Delete button with confirmation
- Update after edit/delete

## Related Files

- `apps/web/src/app/[locale]/dashboard/maintenance/page.tsx` - Main page
- `apps/web/src/lib/api.ts` - Department API

## Implementation Steps

- [ ] Fetch departments on page load
- [ ] Add department selector to form
- [ ] Add `editingId` state for edit mode
- [ ] Add Edit button to notice cards
- [ ] Add Delete button to notice cards
- [ ] Implement edit mode (populate form)
- [ ] Implement delete with confirmation
- [ ] Show department name in notice list
- [ ] Update form submit to handle edit vs create

## Success Criteria

- Department dropdown works and saves departmentId
- Edit button populates form correctly
- Delete button removes notice after confirmation
- Department name displays in list
- Form clears after save/cancel


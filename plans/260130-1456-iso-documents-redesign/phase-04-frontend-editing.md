# Phase 04: Frontend Editing Capability

## Context Links

- Parent: [plan.md](plan.md)
- Depends on: [phase-03-frontend-display.md](phase-03-frontend-display.md)
- Research: [researcher-02-report.md](research/researcher-02-report.md), [researcher-03-report.md](research/researcher-03-report.md)
- Component: `apps/web/src/components/documents/document-list.tsx`

## Overview

- **Date:** 2026-01-30
- **Priority:** High
- **Description:** Create ISO metadata edit dialog with user picker and date picker. Add edit action to table.
- **Implementation status:** Done
- **Review status:** Done ([phase-04-code-review.md](reports/phase-04-code-review.md))

## Key Insights

- Need dialog component for editing ISO metadata
- User picker needed for preparer/reviewer/approver selection
- Date picker needed for approval/receipt dates
- Level can be text input or dropdown (depending on requirements)
- Need to handle null values (clearing fields)

## Requirements

### Functional

- Create `IsoMetadataEditDialog` component
- User picker for selecting preparer/reviewer/approver
- Date picker for approval/receipt dates
- Level input (text or dropdown)
- Save/Cancel buttons
- Add "Edit Metadata" action button to table
- Handle API update call
- Refresh table after save

### Non-Functional

- Use ShadcnUI components (Dialog, Select, DatePicker)
- Follow existing component patterns
- Support i18n
- Handle loading and error states
- Validate input before save

## Architecture

### Component Structure

```
IsoMetadataEditDialog
├── Dialog (ShadcnUI)
├── Form
│   ├── Level Input/Select
│   ├── Preparer UserPicker
│   ├── Reviewer UserPicker
│   ├── Approver UserPicker
│   ├── Approval Date DatePicker
│   ├── Receipt Date DatePicker
│   ├── Save Button
│   └── Cancel Button
└── Error Handling
```

### User Picker Component

```typescript
interface UserPickerProps {
  value?: string | null;
  onChange: (userId: string | null) => void;
  placeholder?: string;
  label: string;
}

// Display: Searchable dropdown with user list
// Options: User fullName + department
// Clear option: "None" to set null
```

### Date Picker Component

```typescript
interface DatePickerProps {
  value?: Date | null;
  onChange: (date: Date | null) => void;
  placeholder?: string;
  label: string;
}

// Use ShadcnUI DatePicker or similar
// Support clearing date (null)
```

## Related Code Files

### Files to Create

- `apps/web/src/components/documents/iso-metadata-edit-dialog.tsx` - Main edit dialog
- `apps/web/src/components/documents/user-picker.tsx` - User selection component (if not exists)

### Files to Modify

- `apps/web/src/components/documents/document-list.tsx` - Add edit action button
- `apps/web/src/lib/api.ts` - Add update ISO metadata API method
- `apps/web/messages/{locale}/documents.json` - Add translation keys

## Implementation Steps

1. **Create User Picker Component**
   - Fetch users list from API
   - Create searchable dropdown
   - Display user fullName + department
   - Support "None" option for clearing
   - Handle loading state

2. **Create Date Picker Wrapper**
   - Use ShadcnUI DatePicker or similar
   - Support null values
   - Format dates according to locale
   - Handle clearing date

3. **Create IsoMetadataEditDialog Component**
   - Use ShadcnUI Dialog component
   - Form with all ISO metadata fields
   - User pickers for preparer/reviewer/approver
   - Date pickers for approval/receipt dates
   - Level input (text or select)
   - Save/Cancel buttons
   - Loading state during save
   - Error handling

4. **Add API Method**
   - Add `updateIsoMetadata` to API client
   - Handle request/response
   - Error handling

5. **Update DocumentList Component**
   - Add "Edit Metadata" button in Actions column
   - Open dialog on click
   - Pass document data to dialog
   - Refresh table after save

6. **Add Translation Keys**
   - Add keys for dialog title, labels, buttons
   - Add keys for user picker placeholder
   - Add keys for date picker placeholder

7. **Test Editing**
   - Test opening dialog
   - Test selecting users
   - Test selecting dates
   - Test clearing fields (null)
   - Test saving
   - Test error handling
   - Test table refresh after save

## Todo List

- [x] Create UserPicker component
- [x] Create DatePicker wrapper (if needed)
- [x] Create IsoMetadataEditDialog component
- [x] Add form fields (level, preparer, reviewer, approver, dates)
- [x] Add Save/Cancel buttons
- [x] Add loading state
- [x] Add error handling
- [x] Add API method for update
- [x] Add "Edit Metadata" button to table
- [x] Wire up dialog opening/closing
- [x] Handle table refresh after save
- [x] Add translation keys
- [ ] Test all functionality (manual)

## Success Criteria

- Dialog opens when "Edit Metadata" is clicked
- All fields are editable
- User picker works correctly
- Date picker works correctly
- Fields can be cleared (set to null)
- Save updates document via API
- Table refreshes after save
- Error messages are displayed
- Loading state is shown during save

## Risk Assessment

### Risks

- **User list performance:** Fetch users efficiently
- **Date format issues:** Use consistent date format
- **Validation:** Validate before save

### Mitigations

- Cache user list or fetch on demand
- Use ISO date strings for API
- Validate all fields before save
- Show clear error messages

## Security Considerations

- Authorization check on backend (already handled)
- Validate user IDs before sending to API
- Sanitize input to prevent XSS
- Use controlled components for form inputs

## Next Steps

- Proceed to Phase 05: Filtering Enhancement
- Enable Level filter with actual data
- Add optional user and date filters

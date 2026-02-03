# Phase 03: Frontend Display Enhancement

## Context Links

- Parent: [plan.md](plan.md)
- Depends on: [phase-02-backend-api.md](phase-02-backend-api.md)
- Research: [researcher-02-report.md](research/researcher-02-report.md), [researcher-03-report.md](research/researcher-03-report.md)
- Component: `apps/web/src/components/documents/document-list.tsx`
- Page: `apps/web/src/app/[locale]/dashboard/documents/page.tsx`

## Overview

- **Date:** 2026-01-30
- **Priority:** High
- **Description:** Update DocumentList component to display actual ISO metadata data instead of placeholders. Format dates and user names properly.
- **Implementation status:** Completed (2026-01-30)
- **Review status:** Completed — [phase-03-code-review.md](reports/phase-03-code-review.md)

## Key Insights

- Current table shows "—" placeholders for missing fields
- API now returns ISO metadata fields with user relations
- Need to format dates (approvalDate, receiptDate)
- Need to display user names (preparer, reviewer, approver)
- Level field needs to be displayed

## Requirements

### Functional

- Replace placeholders with actual data
- Format dates using locale-aware formatting
- Display user names (fullName or username)
- Show level value
- Handle null/undefined values gracefully

### Non-Functional

- Use existing date formatting utilities
- Follow existing component patterns
- Maintain responsive design
- Support i18n for date formats

## Architecture

### Component Updates

```typescript
// DocumentList component
interface Document {
  // ... existing fields ...
  level?: string | null;
  preparer?: { id: string; fullName: string; username: string } | null;
  reviewer?: { id: string; fullName: string; username: string } | null;
  approver?: { id: string; fullName: string; username: string } | null;
  approvalDate?: string | null;
  receiptDate?: string | null;
}

// Display logic
const formatDate = (date: string | null | undefined, locale: string) => {
  if (!date) return PLACEHOLDER;
  return new Date(date).toLocaleDateString(locale);
};

const formatUserName = (
  user: { fullName: string; username: string } | null | undefined
) => {
  if (!user) return PLACEHOLDER;
  return user.fullName || user.username;
};
```

### Data Flow

1. API returns documents with ISO metadata and user relations
2. Component receives data via props
3. Format dates and user names
4. Render in table cells

## Related Code Files

### Files to Modify

- `apps/web/src/components/documents/document-list.tsx` - Update display logic
- `apps/web/src/app/[locale]/dashboard/documents/page.tsx` - Ensure API includes relations

### Files to Create

- `apps/web/src/lib/utils/date-formatter.ts` - Date formatting utility (if not exists)

## Implementation Steps

1. **Update Document Interface**
   - Add ISO metadata fields to Document interface
   - Include user relation types (preparer, reviewer, approver)

2. **Create Date Formatter Utility**
   - Use `toLocaleDateString` with locale
   - Handle null/undefined values
   - Support multiple date formats

3. **Create User Name Formatter**
   - Display fullName if available, fallback to username
   - Handle null/undefined values

4. **Update DocumentList Component**
   - Replace Level placeholder with `doc.level ?? PLACEHOLDER`
   - Replace Preparer placeholder with formatted user name
   - Replace Reviewer placeholder with formatted user name
   - Replace Approver placeholder with formatted user name
   - Replace Approval Date placeholder with formatted date
   - Replace Receipt Date placeholder with formatted date

5. **Update API Call**
   - Ensure API includes preparer, reviewer, approver relations
   - Verify data structure matches interface

6. **Test Display**
   - Test with documents that have ISO metadata
   - Test with documents without ISO metadata (null values)
   - Test date formatting with different locales
   - Test user name display

## Todo List

- [x] Update Document interface with ISO metadata fields
- [x] Use existing formatDateShort from lib/utils (no new date utility)
- [x] Add formatUserName and formatDateOrPlaceholder helpers
- [x] Update Level column display (getLevelDisplayName with locale)
- [x] Update Preparer column display
- [x] Update Reviewer column display
- [x] Update Approver column display
- [x] Update Approval Date column display
- [x] Update Receipt Date column display
- [x] Documents page Document interface extended for API response
- [ ] Test with real data (manual)
- [ ] Test with null values (manual)
- [ ] Test date formatting (manual)

## Success Criteria

- All columns display actual data (no placeholders for existing data)
- Dates are formatted correctly for locale
- User names are displayed properly
- Null values show placeholder ("—")
- Component remains responsive
- No performance degradation

## Risk Assessment

### Risks

- **Date format issues:** Use locale-aware formatting
- **User name display:** Handle missing fullName gracefully
- **Performance:** Format dates efficiently

### Mitigations

- Use built-in date formatting functions
- Fallback to username if fullName missing
- Format dates once, cache if needed

## Security Considerations

- No security concerns for display-only changes
- User names are already public data
- Dates are not sensitive

## Next Steps

- Proceed to Phase 04: Frontend Editing Capability
- Create edit dialog component
- Add edit action to table

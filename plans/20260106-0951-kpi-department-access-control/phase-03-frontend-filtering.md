# Phase 3: Frontend Filtering

**Parent Plan:** [plan.md](./plan.md)  
**Status:** ✅ Completed  
**Priority:** Medium

---

## Context

Frontend KPI page should reflect backend authorization. Users should only see departments they can access, and UI should prevent unauthorized actions.

## Overview

Update frontend to filter departments and KPI records based on user's role and department. Hide/disable actions for unauthorized access.

## Requirements

1. **Department Dropdown:**
   - Admin/Boss: Show all departments
   - Other users: Show only their department (or hide dropdown if single)

2. **KPI List:**
   - Backend already filters, but frontend should handle empty states
   - Show appropriate message if no KPIs accessible

3. **Action Buttons:**
   - Hide/disable create button if user has no department
   - Show error message on 403 responses
   - Prevent editing/deleting unauthorized records (backend will reject anyway)

4. **User Context:**
   - Get user info from auth context/session
   - Check user roles and department
   - Pass department filter to API calls

## Architecture

### Component Updates

**KPI Page (`apps/web/src/app/[locale]/dashboard/kpi/page.tsx`):**

- Get current user from auth context
- Filter departments based on user role
- Handle 403 errors gracefully
- Show appropriate empty states

**API Client (`apps/web/src/lib/api.ts`):**

- KPI endpoints already exist, no changes needed
- Error handling for 403 responses

### Helper Functions

```typescript
// Check if user has full KPI access
function hasFullKpiAccess(user: User): boolean;

// Get accessible departments for user
function getAccessibleDepartments(
  user: User,
  allDepartments: Department[]
): Department[];
```

## Implementation Steps

1. **Update KPI Page Component**
   - Get current user from auth context/session
   - Check if user is admin/boss
   - Filter departments list based on user's department
   - Update department dropdown to show filtered list
   - Handle 403 errors with user-friendly messages

2. **Add Helper Functions**
   - `hasFullKpiAccess(user)`: Check admin/boss role
   - `getAccessibleDepartments(user, departments)`: Filter departments
   - `getUserDepartment(user)`: Extract user's department

3. **Update Error Handling**
   - Catch 403 errors from API calls
   - Show toast/alert with appropriate message
   - Redirect or disable actions as needed

4. **Update UI States**
   - Show "No access" message if user has no department
   - Disable create button if no department access
   - Show empty state if no KPIs accessible

5. **Test Scenarios**
   - Admin sees all departments and KPIs
   - Boss sees all departments and KPIs
   - Regular user sees only their department
   - User with no department sees appropriate message

## Todo List

- [ ] Get user info in KPI page component
- [ ] Add helper functions for access checking
- [ ] Filter departments dropdown
- [ ] Update error handling for 403 responses
- [ ] Add UI states for no access scenarios
- [ ] Test with different user roles
- [ ] Update i18n messages if needed

## Success Criteria

- [ ] Admin sees all departments and KPIs
- [ ] Boss sees all departments and KPIs
- [ ] Regular users see only their department
- [ ] Appropriate error messages shown
- [ ] UI prevents unauthorized actions
- [ ] All user scenarios tested

## Risk Assessment

- **Low Risk:** Frontend changes are straightforward
- **Potential Issue:** User context not available (need to check auth implementation)
- **UX:** Ensure clear messaging for restricted access

---

**Next:** See phase-04-testing-validation.md

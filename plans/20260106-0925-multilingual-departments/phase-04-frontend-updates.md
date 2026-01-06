# Phase 4: Frontend Updates

**Status:** ✅ Completed

## Changes Made

1. **Updated API Interface** (`apps/web/src/lib/api.ts`)
   - Added `nameEn`, `nameVi`, `nameZh` to `Department` interface
   - Updated `CreateDepartmentDto` and `UpdateDepartmentDto`
   - Created `getDepartmentName()` helper function

2. **Helper Function**
   - `getDepartmentName(department, locale)`: Returns name based on locale
   - Falls back to Vietnamese or code if language not available
   - Supports: en, vi, zh

3. **Updated Components**
   - `departments/page.tsx`: Uses helper to display names
   - `boss/department-grid.tsx`: Displays multilingual names
   - `boss/view-selector.tsx`: Shows department name in current locale
   - `maintenance/page.tsx`: Updated to use helper function

4. **Locale Integration**
   - All components use `useLocale()` from next-intl
   - Names automatically switch based on user's language preference

## User Experience

- Department names now display in the user's selected language
- Seamless switching between English, Vietnamese, and Chinese
- Backward compatible with existing data


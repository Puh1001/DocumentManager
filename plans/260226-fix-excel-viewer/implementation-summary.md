# Excel Viewer Fix - Implementation Summary

## Problem Solved
Fixed Excel viewer showing `[object Object]` placeholders and malformed headers. Replaced fragile ExcelJS-based implementation with SheetJS.

## Root Cause
- ExcelJS cell value extraction logic was complex and failed for certain cell types
- When `cell.text` returned objects, `String()` conversion produced `[object Object]`
- ExcelJS only supports .xlsx, not legacy .xls format

## Solution Implemented
**Replaced ExcelJS with SheetJS (xlsx)** - already installed in project
- SheetJS supports both .xls and .xlsx formats
- Uses `sheet_to_html()` utility for clean HTML rendering
- Simpler, more reliable cell value extraction
- No complex manual HTML generation

## Changes Made

### 1. `apps/web/src/components/viewers/xlsx-viewer.tsx`
- **Removed**: ExcelJS import and complex cell parsing logic (~250 lines)
- **Added**: SheetJS (xlsx) import and simple parsing
- **Features**:
  - Supports both .xls and .xlsx
  - Uses `XLSX.utils.sheet_to_html()` for rendering
  - Maintains same component interface (fileUrl prop)
  - Added optional `fileType` prop for future enhancements

### 2. Updated Call Sites
- `apps/web/src/app/[locale]/dashboard/documents/[id]/view/page.tsx`: Added `fileType` prop
- `apps/web/src/components/client/client-file-viewer.tsx`: Added `fileType` prop

### 3. CSS Styling
- Existing `.xlsx-content` and `.xlsx-table` styles work with SheetJS output
- Added class injection to ensure table has correct class name

## Benefits
✅ Fixes `[object Object]` rendering issue
✅ Supports legacy .xls format
✅ Simpler, more maintainable code (~100 lines vs ~320 lines)
✅ Better error handling
✅ No new dependencies (SheetJS already installed)

## Testing Recommendations
1. Test with .xlsx files (should work as before, but better)
2. Test with .xls files (now supported!)
3. Test with files containing formulas
4. Test with files containing merged cells
5. Test with multiple sheets
6. Verify no regressions in existing functionality

## Next Steps (Optional)
If user wants even better viewer (like Zalo):
- Consider Luckysheet (archived, but still works)
- Or Univer (official successor to Luckysheet)
- These provide full spreadsheet UI with editing capabilities

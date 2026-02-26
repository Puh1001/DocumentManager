# Fix Excel Viewer - Replace with Ready-Made Solution

## Problem
Current Excel viewer shows `[object Object]` placeholders and malformed headers. ExcelJS-based implementation is complex and error-prone.

## Root Cause Analysis
1. **ExcelJS cell value extraction is fragile**: Complex logic in `extractCellValue()` fails for certain cell types
2. **Object stringification**: When `cell.text` or `cell.value` returns objects, `String()` conversion produces `[object Object]`
3. **No .xls support**: ExcelJS only supports .xlsx, not legacy .xls format
4. **Manual HTML generation**: Building HTML tables manually is error-prone

## Solution Options

### Option 1: SheetJS (xlsx) - Quick Fix ✅ RECOMMENDED
- **Pros**: Already installed, supports .xls and .xlsx, simple API, `sheet_to_html()` utility
- **Cons**: Basic rendering, no advanced formatting
- **Effort**: Low (2-3 hours)
- **Best for**: Quick fix, maintain current simple viewer

### Option 2: Luckysheet - Professional Viewer ✅ BEST FOR UX
- **Pros**: Full-featured online spreadsheet (like Zalo), beautiful UI, supports .xls/.xlsx, editing capabilities
- **Cons**: Larger bundle size (~2MB), more complex integration
- **Effort**: Medium (4-6 hours)
- **Best for**: Professional viewer matching Zalo quality

### Option 3: Syncfusion React Spreadsheet
- **Pros**: Feature-rich, commercial support
- **Cons**: Commercial license required, expensive
- **Effort**: Medium
- **Best for**: Enterprise with budget

## Decision: Implement Luckysheet
- Matches user requirement (Zalo-quality viewer)
- Open source (MIT)
- Handles both .xls and .xlsx
- Professional appearance

## Implementation Plan

### Phase 1: Install and Setup Luckysheet
- Install `luckysheet-react` and dependencies
- Create basic wrapper component
- Test with sample .xlsx file

### Phase 2: Integrate with Existing Viewer
- Replace XlsxViewer component
- Maintain same props interface (fileUrl)
- Handle loading states and errors
- Support both .xls and .xlsx

### Phase 3: Styling and Polish
- Match app design system
- Handle permissions (view-only mode)
- Add download/print buttons if needed

### Phase 4: Testing
- Test with various Excel files (.xls, .xlsx)
- Test with complex sheets (formulas, formatting, merged cells)
- Verify no regressions

## Files to Modify
- `apps/web/src/components/viewers/xlsx-viewer.tsx` - Replace implementation
- `apps/web/package.json` - Add luckysheet-react dependency
- Update any other files using XlsxViewer if needed

# Debug Report: Users cannot view .xls files in document viewer

## Problem Summary

Users see **"Không có dữ liệu trong file"** when opening Excel files in the document viewer. The affected files are **.xls** (Excel 97–2003). The app accepts both `.xls` and `.xlsx` and routes both to `XlsxViewer`, but only `.xlsx` content is shown; `.xls` always shows the empty-state message.

## Root Cause

**ExcelJS does not support the legacy .xls (BIFF) format.** It only supports **.xlsx** (Office Open XML).

- Viewer: `apps/web/src/components/viewers/xlsx-viewer.tsx`
- It uses **ExcelJS** only: `wb.xlsx.load(arrayBuffer)` (line 31).
- ExcelJS API is `workbook.xlsx.*` — the "xlsx" refers to the OOXML format, not a generic "Excel" reader.
- When the uploaded file is **.xls**:
  - ExcelJS either fails to parse it as .xlsx or produces an empty workbook.
  - Code then hits: `if (!workbook || workbook.worksheets.length === 0)` (lines 281–286) and shows **"Không có dữ liệu trong file"**.

So the issue is **format support**, not missing file or wrong URL: the same viewer path is used for .xls and .xlsx, but the parser only understands .xlsx.

## Evidence

| Item                   | Location / detail                                                                              |
| ---------------------- | ---------------------------------------------------------------------------------------------- |
| Empty-state message    | `xlsx-viewer.tsx` L285: `Không có dữ liệu trong file`                                          |
| Parser used            | `xlsx-viewer.tsx` L4, L30–31: `ExcelJS`, `wb.xlsx.load(arrayBuffer)`                           |
| ExcelJS format support | ExcelJS readme/docs: only `.xlsx` (OOXML); no .xls/BIFF support                                |
| Routing                | `view/page.tsx` L199: `["xls","xlsx"].includes(docData.fileType)` → same `XlsxViewer` for both |
| Dependency             | `package.json`: `exceljs`, and `xlsx` (SheetJS) — SheetJS supports both .xls and .xlsx         |

## Fix Plan

1. **Support .xls in the same viewer**
   - Add an optional `fileType?: string` to `XlsxViewer`.
   - When `fileType === "xls"` (or when ExcelJS load fails and we know the file is .xls), parse with **SheetJS** (`xlsx`).
   - Use one shared rendering path: convert SheetJS workbook to the same table/tabs UI (sheet names + cell grid) so .xls and .xlsx look the same.

2. **Call site**
   - In `apps/web/src/app/[locale]/dashboard/documents/[id]/view/page.tsx`, pass `fileType={docData.fileType}` into `XlsxViewer`.
   - Do the same in any other place that renders `XlsxViewer` with known file type (e.g. `client-file-viewer.tsx`, `document-detail.tsx` if they use it).

3. **Implementation details**
   - In `xlsx-viewer.tsx`:
     - If `fileType === "xls"`, fetch buffer then `XLSX.read(buffer, { type: "array" })`, then build the same tabs + table structure from `workbook.SheetNames` and `workbook.Sheets[name]` (e.g. `XLSX.utils.sheet_to_html` or manual iteration over range).
     - Else keep current ExcelJS path for .xlsx.
   - Optional: try ExcelJS first for .xlsx; if load fails and fileType is `xls`, fallback to SheetJS (handles mislabelled extension).

4. **No backend change required** for viewing; only frontend viewer and prop wiring.

5. **Testing**
   - Add a test or manual check: upload a .xls file, open in document viewer → content and sheets visible, no "Không có dữ liệu trong file" for valid .xls.

## Unresolved questions

- None for this fix. If product wants to disallow .xls uploads or show a different message for unsupported formats, that can be a separate change.

# Phase 1: Quick Fix with SheetJS

## Goal
Replace ExcelJS with SheetJS (already installed) to fix `[object Object]` issue and add .xls support.

## Implementation
1. Replace ExcelJS parsing with SheetJS
2. Use `sheet_to_html()` utility for clean HTML rendering
3. Support both .xls and .xlsx formats
4. Maintain same component interface

## Changes
- `xlsx-viewer.tsx`: Replace ExcelJS with SheetJS
- Use `XLSX.read()` and `XLSX.utils.sheet_to_html()` for rendering
- Handle sheet tabs using SheetJS workbook structure

"use client";

import { useState, useEffect, useCallback } from "react";
import ExcelJS from "exceljs";
import { api } from "@/lib/api";

interface XlsxViewerProps {
  fileUrl: string;
}

export function XlsxViewer({ fileUrl }: XlsxViewerProps) {
  const [workbook, setWorkbook] = useState<ExcelJS.Workbook | null>(null);
  const [activeSheet, setActiveSheet] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadXlsx = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Extract endpoint from fileUrl (remove /api prefix if present)
      const endpoint = fileUrl.startsWith("/api/")
        ? fileUrl.substring(4)
        : fileUrl;

      // Fetch the document with authentication
      const arrayBuffer = await api.fetchFileAsArrayBuffer(endpoint);

      // Parse the Excel file with ExcelJS to preserve formatting
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(arrayBuffer);
      setWorkbook(wb);

      // Set the first sheet as active
      if (wb.worksheets.length > 0) {
        setActiveSheet(wb.worksheets[0].name);
      }
    } catch (err) {
      console.error("Failed to load XLSX:", err);
      setError("Không thể tải tài liệu. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }, [fileUrl]);

  useEffect(() => {
    loadXlsx();
  }, [loadXlsx]);

  const renderSheet = (sheetName: string) => {
    if (!workbook) return null;

    const worksheet = workbook.getWorksheet(sheetName);
    if (!worksheet) return null;

    // Build HTML table with preserved formatting
    let html = '<table class="xlsx-table">';

    // Get actual used range
    const rowCount = worksheet.rowCount || 0;
    const columnCount = worksheet.columnCount || 0;

    if (rowCount === 0 || columnCount === 0) {
      return (
        <div className="flex items-center justify-center h-full text-muted-foreground">
          Sheet trống
        </div>
      );
    }

    // Render rows
    for (let rowNum = 1; rowNum <= rowCount; rowNum++) {
      const row = worksheet.getRow(rowNum);
      if (!row.hasValues) continue; // Skip empty rows

      html += "<tr>";

      for (let colNum = 1; colNum <= columnCount; colNum++) {
        const cell = row.getCell(colNum);

        // Get cell value - prioritize calculated value over formula
        // ExcelJS may return formula string in cell.text, so we need to check cell.value first
        let cellValue = "";

        // Helper function to extract value from cell
        const extractCellValue = (value: ExcelJS.CellValue): string => {
          if (value === null || value === undefined) {
            return "";
          }

          // Handle Date objects
          if (value instanceof Date) {
            return value.toLocaleDateString();
          }

          // Handle primitive types
          if (typeof value !== "object") {
            return String(value);
          }

          // Handle object types
          // Rich text
          const richTextValue = (value as ExcelJS.CellRichTextValue).richText;
          if (richTextValue && Array.isArray(richTextValue)) {
            return richTextValue
              .map((rt: ExcelJS.RichText) => rt.text ?? "")
              .join("");
          }

          // Text property
          const textValue = (value as { text?: unknown }).text;
          if (textValue !== null && textValue !== undefined) {
            return String(textValue);
          }

          // Hyperlink
          const hyperlinkValue = (value as { hyperlink?: unknown }).hyperlink;
          if (hyperlinkValue) {
            return String(hyperlinkValue);
          }

          // Shared string reference (ExcelJS internal)
          const sharedStringValue = (value as { sharedString?: unknown })
            .sharedString;
          if (sharedStringValue !== undefined) {
            return String(sharedStringValue);
          }

          // Try to find any string-like property
          for (const key in value) {
            if (
              typeof value[key as keyof typeof value] === "string" &&
              value[key as keyof typeof value]
            ) {
              return value[key as keyof typeof value];
            }
            if (typeof value[key as keyof typeof value] === "number") {
              return String(value[key as keyof typeof value]);
            }
          }

          // Last resort: try JSON.stringify for debugging, but prefer empty
          // This prevents [object Object] from appearing
          return "";
        };

        // Check if cell has a formula
        const hasFormula = cell.formula !== null && cell.formula !== undefined;

        // For cells with formulas, prioritize calculated value over formula string
        if (hasFormula && cell.value !== null && cell.value !== undefined) {
          cellValue = extractCellValue(cell.value);
        }

        // If no calculated value for formula cells, or no formula at all, try cell.text
        if (!cellValue) {
          try {
            const cellText = cell.text;
            if (
              cellText !== null &&
              cellText !== undefined &&
              cellText !== ""
            ) {
              const textStr = String(cellText);

              // Filter out formulas, cell references, and Excel errors
              // Formulas start with '='
              if (textStr.startsWith("=")) {
                // Skip formulas - we want calculated values only
                cellValue = "";
              }
              // Cell references pattern: matches Excel cell notation (e.g., AZ6, BA6, A1, etc.)
              else if (/^[A-Z]+\d+$/.test(textStr.trim())) {
                // This looks like a cell reference, skip it
                cellValue = "";
              }
              // Excel error values
              else if (
                /^#(REF!|N\/A|VALUE!|DIV\/0!|NAME\?|NULL!|NUM!)$/.test(textStr)
              ) {
                // Show Excel errors as-is
                cellValue = textStr;
              }
              // Valid value
              else {
                cellValue = textStr;
              }
            }
          } catch (e) {
            // cell.text getter failed, will fallback to cell.value
          }
        }

        // Final fallback to cell.value if still no value
        if (!cellValue && cell.value !== null && cell.value !== undefined) {
          cellValue = extractCellValue(cell.value);
        }

        // For formula cells without calculated value, show empty instead of formula
        // This prevents showing formulas and cell references to users
        if (hasFormula && !cellValue) {
          cellValue = ""; // Show empty for formulas without calculated values
        }

        // Always render cells with style, even if empty (for formatting)
        // Only skip completely empty cells without any content or style
        const hasContent = cellValue !== "" || cell.style;
        if (!hasContent) continue;

        // Get cell style
        const styles: string[] = [];
        if (cell.font) {
          if (cell.font.bold) styles.push("font-weight: bold");
          if (cell.font.italic) styles.push("font-style: italic");
          if (cell.font.size) styles.push(`font-size: ${cell.font.size}pt`);
          if (cell.font.color?.argb) {
            const color = cell.font.color.argb.slice(2);
            styles.push(`color: #${color}`);
          }
        }
        if (cell.fill) {
          // Handle different fill types
          if (
            "pattern" in cell.fill &&
            cell.fill.pattern === "solid" &&
            "fgColor" in cell.fill &&
            cell.fill.fgColor?.argb
          ) {
            const bgColor = cell.fill.fgColor.argb.slice(2);
            styles.push(`background-color: #${bgColor}`);
          } else if ("fgColor" in cell.fill && cell.fill.fgColor?.argb) {
            const bgColor = cell.fill.fgColor.argb.slice(2);
            styles.push(`background-color: #${bgColor}`);
          }
        }
        if (cell.alignment) {
          if (cell.alignment.horizontal) {
            styles.push(`text-align: ${cell.alignment.horizontal}`);
          }
          if (cell.alignment.vertical) {
            styles.push(`vertical-align: ${cell.alignment.vertical}`);
          }
        }

        const styleString = styles.join("; ");
        const styleAttr = styleString ? ` style="${styleString}"` : "";

        const tag = rowNum === 1 ? "th" : "td";
        html += `<${tag}${styleAttr}>${cellValue}</${tag}>`;
      }

      html += "</tr>";
    }

    html += "</table>";

    return (
      <div
        className="xlsx-content overflow-auto"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-red-500">
        {error}
      </div>
    );
  }

  if (!workbook || workbook.worksheets.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Không có dữ liệu trong file
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Sheet tabs */}
      {workbook.worksheets.length > 1 && (
        <div className="flex gap-2 p-2 border-b bg-gray-50 overflow-x-auto">
          {workbook.worksheets.map((sheet) => {
            const name = sheet.name;
            return (
              <button
                key={name}
                onClick={() => setActiveSheet(name)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeSheet === name
                    ? "bg-primary text-primary-foreground"
                    : "bg-gray-200 hover:bg-gray-300"
                }`}
              >
                {name}
              </button>
            );
          })}
        </div>
      )}

      {/* Sheet content */}
      <div className="flex-1 overflow-auto p-4">{renderSheet(activeSheet)}</div>
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import * as XLSX from "xlsx";
import { api } from "@/lib/api";

interface XlsxViewerProps {
  fileUrl: string;
  fileType?: string; // Optional: "xls" or "xlsx" to help with parsing (not currently used, SheetJS auto-detects)
}

interface SheetData {
  name: string;
  html: string;
}

export function XlsxViewer({ fileUrl, fileType: _fileType }: XlsxViewerProps) {
  const [sheets, setSheets] = useState<SheetData[]>([]);
  const [activeSheetIndex, setActiveSheetIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadExcel = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Extract endpoint from fileUrl (remove /api prefix if present)
      const endpoint = fileUrl.startsWith("/api/")
        ? fileUrl.substring(4)
        : fileUrl;

      // Fetch the document with authentication
      const arrayBuffer = await api.fetchFileAsArrayBuffer(endpoint);

      // Parse the Excel file with SheetJS (supports both .xls and .xlsx)
      const workbook = XLSX.read(arrayBuffer, { type: "array" });

      if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        setError("Không có dữ liệu trong file");
        return;
      }

      // Convert each sheet to HTML
      const sheetData: SheetData[] = workbook.SheetNames.map((sheetName) => {
        const worksheet = workbook.Sheets[sheetName];
        // Use sheet_to_html to generate clean HTML table
        const html = XLSX.utils.sheet_to_html(worksheet, {
          id: `sheet-${sheetName}`,
          editable: false,
        });

        return {
          name: sheetName,
          html: html || "",
        };
      });

      setSheets(sheetData);
      setActiveSheetIndex(0);
    } catch (err) {
      console.error("Failed to load Excel file:", err);
      setError("Không thể tải tài liệu. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }, [fileUrl]);

  useEffect(() => {
    loadExcel();
  }, [loadExcel]);

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

  if (sheets.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Không có dữ liệu trong file
      </div>
    );
  }

  const activeSheet = sheets[activeSheetIndex];

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Sheet tabs */}
      {sheets.length > 1 && (
        <div className="flex gap-2 p-2 border-b bg-gray-50 overflow-x-auto">
          {sheets.map((sheet, index) => (
            <button
              key={sheet.name}
              onClick={() => setActiveSheetIndex(index)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                activeSheetIndex === index
                  ? "bg-primary text-primary-foreground"
                  : "bg-gray-200 hover:bg-gray-300"
              }`}
            >
              {sheet.name}
            </button>
          ))}
        </div>
      )}

      {/* Sheet content */}
      <div className="flex-1 overflow-auto p-4">
        {activeSheet && (
          <div
            className="xlsx-content"
            dangerouslySetInnerHTML={{
              __html: activeSheet.html.replace(
                /<table/g,
                '<table class="xlsx-table"'
              ),
            }}
          />
        )}
      </div>
    </div>
  );
}

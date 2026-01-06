"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";

interface DocxViewerProps {
  fileUrl: string;
}

export function DocxViewer({ fileUrl }: DocxViewerProps) {
  const [html, setHtml] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDocx = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Extract endpoint from fileUrl (remove /api prefix if present)
      const endpoint = fileUrl.startsWith("/api/")
        ? fileUrl.substring(4)
        : fileUrl;

      // Fetch the document with authentication
      const arrayBuffer = await api.fetchFileAsArrayBuffer(endpoint);

      // Use mammoth to convert to HTML with style preservation
      // Note: mammoth is loaded dynamically to reduce bundle size
      const mammoth = await import("mammoth");
      const result = await mammoth.convertToHtml(
        { arrayBuffer },
        {
          styleMap: [
            "p[style-name='Heading 1'] => h1:fresh",
            "p[style-name='Heading 2'] => h2:fresh",
            "p[style-name='Heading 3'] => h3:fresh",
            "p[style-name='Heading 4'] => h4:fresh",
            "p[style-name='Heading 5'] => h5:fresh",
            "p[style-name='Heading 6'] => h6:fresh",
            "r[style-name='Strong'] => strong",
            "r[style-name='Emphasis'] => em",
          ],
          includeDefaultStyleMap: true,
        }
      );

      setHtml(result.value);
    } catch (err) {
      console.error("Failed to load DOCX:", err);
      setError("Không thể tải tài liệu. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }, [fileUrl]);

  useEffect(() => {
    loadDocx();
  }, [loadDocx]);

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

  return (
    <div className="h-full overflow-auto bg-white">
      <div className="max-w-4xl mx-auto p-8">
        <div
          className="docx-content prose prose-slate max-w-none"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </div>
  );
}


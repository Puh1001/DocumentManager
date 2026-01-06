"use client";

import { useRef, useEffect, useState } from "react";
import { api } from "@/lib/api";

interface PdfViewerProps {
  fileUrl: string;
  canDownload: boolean;
  canPrint: boolean;
}

export function PdfViewer({ fileUrl, canDownload, canPrint }: PdfViewerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const blobUrlRef = useRef<string | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch file with authentication and create blob URL
    const loadPdf = async () => {
      try {
        setLoading(true);
        setError(null);

        // Revoke previous blob URL if exists
        if (blobUrlRef.current) {
          URL.revokeObjectURL(blobUrlRef.current);
          blobUrlRef.current = null;
        }

        // Extract endpoint from fileUrl (remove /api prefix if present)
        const endpoint = fileUrl.startsWith("/api/")
          ? fileUrl.substring(4)
          : fileUrl;
        const url = await api.fetchFileAsBlobUrl(endpoint);
        blobUrlRef.current = url;
        setBlobUrl(url);
      } catch (err) {
        console.error("Failed to load PDF:", err);
        setError("Không thể tải tài liệu. Vui lòng thử lại.");
      } finally {
        setLoading(false);
      }
    };

    loadPdf();

    // Cleanup blob URL on unmount or when fileUrl changes
    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [fileUrl]);

  useEffect(() => {
    if (!blobUrl) return;

    // Note: Browser PDF viewer controls are limited
    // For stricter control, use server-side PDF-to-image conversion
    if (iframeRef.current && iframeRef.current.contentWindow) {
      // Attempt to disable context menu in iframe (limited effectiveness)
      const iframe = iframeRef.current;
      iframe.addEventListener("load", () => {
        try {
          // This may not work due to cross-origin restrictions
          const iframeDoc =
            iframe.contentDocument || iframe.contentWindow?.document;
          if (iframeDoc) {
            iframeDoc.addEventListener("contextmenu", (e) =>
              e.preventDefault()
            );
          }
        } catch (e) {
          // Cross-origin restrictions prevent access
          console.debug(
            "Cannot access iframe content (expected for PDF viewer)"
          );
        }
      });
    }
  }, [canDownload, canPrint, blobUrl]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (error || !blobUrl) {
    return (
      <div className="flex items-center justify-center h-full text-red-500">
        {error || "Không thể tải tài liệu"}
      </div>
    );
  }

  // Build PDF URL with parameters to control toolbar
  // Note: These parameters are browser-dependent and may not work in all browsers
  const pdfUrl = `${blobUrl}#toolbar=${canDownload ? 1 : 0}&navpanes=${canDownload ? 1 : 0}`;

  return (
    <div className="relative h-full w-full pdf-viewer-container">
      {/* Use object tag as primary method - better compatibility with blob URLs for PDF */}
      <object
        data={blobUrl}
        type="application/pdf"
        className="w-full h-full"
        style={{
          pointerEvents: canDownload ? "auto" : "none",
        }}
      >
        {/* Fallback to iframe if object doesn't work */}
        <iframe
          ref={iframeRef}
          src={pdfUrl}
          className="w-full h-full border-0"
          title="PDF Viewer"
          style={{
            pointerEvents: canDownload ? "auto" : "none",
          }}
        />
        <p className="text-center p-4 text-muted-foreground">
          Trình duyệt của bạn không hỗ trợ xem PDF.{" "}
          <a
            href={blobUrl}
            download
            className="text-primary underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Tải xuống để xem
          </a>
        </p>
      </object>
    </div>
  );
}

# Phase 5: Document Viewer & Security

**Status:** ✅ Completed  
**Priority:** P1 - High  
**Estimated Time:** 2-3 days

---

## Context

Xây dựng web viewer cho PDF và DOCX với các tính năng bảo mật chống sao chép nội dung.

## Requirements

- [x] PDF viewer with navigation
- [x] DOCX viewer (convert to HTML)
- [x] XLSX viewer (convert to HTML table)
- [x] Disable right-click on viewer
- [x] Block Ctrl+C, Ctrl+P shortcuts
- [x] Disable text selection
- [x] Watermark overlay
- [x] Hide download button for unauthorized users

## Supported Formats

| Format | Library    | Method                |
| ------ | ---------- | --------------------- |
| PDF    | native     | Browser iframe/embed  |
| DOCX   | mammoth.js | Convert to HTML       |
| XLSX   | SheetJS    | Convert to HTML table |
| Images | native     | img tag               |

**Note:** PDF viewer uses native browser rendering (no pdfjs dependency). For advanced features, consider server-side PDF-to-image conversion.

## Implementation

### PDF Viewer Component

**Approach:** Use native browser PDF viewer via iframe/embed. Browser handles rendering (Chrome PDFium, Firefox built-in PDF.js, etc.).

```tsx
// components/viewers/PdfViewer.tsx
"use client";

import { useRef, useEffect } from "react";

interface PdfViewerProps {
  fileUrl: string;
  canDownload: boolean;
  canPrint: boolean;
}

export function PdfViewer({ fileUrl, canDownload, canPrint }: PdfViewerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    // Disable download/print in iframe if not authorized
    if (iframeRef.current && iframeRef.current.contentWindow) {
      // Note: Browser PDF viewer controls are limited
      // For stricter control, use server-side PDF-to-image conversion
    }
  }, [canDownload, canPrint]);

  return (
    <div className="relative h-full w-full pdf-viewer-container">
      <iframe
        ref={iframeRef}
        src={`${fileUrl}#toolbar=${canDownload ? 1 : 0}&navpanes=${canDownload ? 1 : 0}`}
        className="w-full h-full border-0"
        title="PDF Viewer"
        // Disable right-click via CSS pointer-events (limited effectiveness)
        style={{ pointerEvents: canDownload ? "auto" : "none" }}
      />
    </div>
  );
}
```

**Alternative: Server-side PDF-to-Image Conversion**

For better security control, convert PDF pages to images on server:

```tsx
// Alternative: Image-based PDF viewer
import { useState, useEffect } from "react";

export function PdfImageViewer({ fileUrl }: { fileUrl: string }) {
  const [pages, setPages] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(0);

  useEffect(() => {
    // Fetch PDF pages as images from API
    // GET /api/documents/{id}/pages?format=image
    fetch(`${fileUrl}/pages`)
      .then((res) => res.json())
      .then((data) => setPages(data.pages));
  }, [fileUrl]);

  return (
    <div className="pdf-image-viewer">
      <div className="flex justify-center mb-4">
        <button onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}>
          Previous
        </button>
        <span className="mx-4">
          Page {currentPage + 1} of {pages.length}
        </span>
        <button
          onClick={() =>
            setCurrentPage((p) => Math.min(pages.length - 1, p + 1))
          }
        >
          Next
        </button>
      </div>
      {pages[currentPage] && (
        <img
          src={pages[currentPage]}
          alt={`Page ${currentPage + 1}`}
          className="max-w-full"
        />
      )}
    </div>
  );
}
```

### DOCX Viewer Component

```tsx
// components/viewers/DocxViewer.tsx
import mammoth from "mammoth";

interface DocxViewerProps {
  fileUrl: string;
}

export function DocxViewer({ fileUrl }: DocxViewerProps) {
  const [html, setHtml] = useState("");

  useEffect(() => {
    async function loadDocx() {
      const response = await fetch(fileUrl);
      const arrayBuffer = await response.arrayBuffer();
      const result = await mammoth.convertToHtml({ arrayBuffer });
      setHtml(result.value);
    }
    loadDocx();
  }, [fileUrl]);

  return (
    <div
      className="docx-content prose max-w-none"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
```

### Copy Protection Hook

```tsx
// hooks/useCopyProtection.ts
export function useCopyProtection(enabled: boolean = true) {
  useEffect(() => {
    if (!enabled) return;

    // Disable right-click
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    // Block keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && ["c", "p", "s", "a"].includes(e.key.toLowerCase())) {
        e.preventDefault();
        return false;
      }
      if (e.key === "PrintScreen") {
        e.preventDefault();
        return false;
      }
    };

    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [enabled]);
}
```

### Copy Protection CSS

```css
/* styles/viewer.css */
.viewer-protected {
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
}

.viewer-protected::selection {
  background: transparent;
}

.watermark-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  background-image: repeating-linear-gradient(
    45deg,
    transparent,
    transparent 100px,
    rgba(0, 0, 0, 0.02) 100px,
    rgba(0, 0, 0, 0.02) 200px
  );
}

.watermark-text {
  position: absolute;
  font-size: 24px;
  color: rgba(0, 0, 0, 0.1);
  transform: rotate(-45deg);
  white-space: nowrap;
}
```

### Watermark Component

```tsx
// components/viewers/Watermark.tsx
interface WatermarkProps {
  text: string; // e.g., user email or "CONFIDENTIAL"
}

export function Watermark({ text }: WatermarkProps) {
  return (
    <div className="watermark-overlay">
      {/* Generate grid of watermark text */}
      {Array.from({ length: 20 }).map((_, i) => (
        <span
          key={i}
          className="watermark-text"
          style={{
            top: `${(i * 15) % 100}%`,
            left: `${(i * 25) % 100}%`,
          }}
        >
          {text}
        </span>
      ))}
    </div>
  );
}
```

## Document Viewer Page

```tsx
// app/documents/[id]/view/page.tsx
export default function DocumentViewPage({
  params,
}: {
  params: { id: string };
}) {
  const { document, permissions } = useDocument(params.id);

  useCopyProtection(!permissions.canDownload);

  return (
    <div className="relative h-screen viewer-protected">
      {document.fileType === "pdf" && (
        <PdfViewer
          fileUrl={`/api/documents/${document.id}/stream`}
          canDownload={permissions.canDownload}
          canPrint={permissions.canPrint}
        />
      )}

      {document.fileType === "docx" && (
        <DocxViewer fileUrl={`/api/documents/${document.id}/stream`} />
      )}

      <Watermark text={`${user.email} - ${new Date().toISOString()}`} />
    </div>
  );
}
```

## Todo List

- [x] Install mammoth.js (for DOCX)
- [x] Create PdfViewer component (native iframe approach)
- [x] Create DocxViewer component
- [x] Create XlsxViewer component (using SheetJS)
- [x] Implement useCopyProtection hook
- [x] Add watermark component
- [x] Style viewer with Tailwind
- [x] Create document view page
- [x] Handle loading and error states
- [x] Add CSS styles for viewer protection and watermark
- [ ] (Optional) Implement server-side PDF-to-image conversion for enhanced security

## Success Criteria

- PDF renders using native browser viewer
- DOCX converts and displays cleanly
- Right-click disabled (limited effectiveness with iframe)
- Ctrl+C/P blocked (limited effectiveness with iframe)
- Text selection disabled via CSS
- Watermark visible on sensitive docs
- Download/print controls limited via URL parameters (browser-dependent)

**Note:** Native browser PDF viewer has limited security control. For stricter protection, consider server-side PDF-to-image conversion.

## Security Notes

- Watermark includes user identifier for traceability
- All document access logged
- Streaming prevents full file caching
- **Limitation:** Native browser PDF viewer has limited security control
  - Browser controls (download/print) vary by browser
  - Right-click and keyboard shortcuts may still work in some browsers
  - Iframe sandboxing provides some isolation but not complete protection
- **Enhanced Security Option:** Server-side PDF-to-image conversion
  - Convert PDF pages to images on server (using pdf-lib, pdf2pic, or similar)
  - Serve images instead of PDF file
  - Better control over download/print/copy protection
  - Trade-off: Larger file sizes, requires server processing

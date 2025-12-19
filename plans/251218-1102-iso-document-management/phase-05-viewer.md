# Phase 5: Document Viewer & Security

**Status:** 🔴 Pending  
**Priority:** P1 - High  
**Estimated Time:** 2-3 days

---

## Context

Xây dựng web viewer cho PDF và DOCX với các tính năng bảo mật chống sao chép nội dung.

## Requirements

- [ ] PDF viewer with navigation
- [ ] DOCX viewer (convert to HTML)
- [ ] Disable right-click on viewer
- [ ] Block Ctrl+C, Ctrl+P shortcuts
- [ ] Disable text selection
- [ ] Watermark overlay
- [ ] Hide download button for unauthorized users

## Supported Formats

| Format | Library           | Method                |
| ------ | ----------------- | --------------------- |
| PDF    | @react-pdf-viewer | Direct render         |
| DOCX   | mammoth.js        | Convert to HTML       |
| XLSX   | SheetJS           | Convert to HTML table |
| Images | native            | img tag               |

## Implementation

### PDF Viewer Component

```tsx
// components/viewers/PdfViewer.tsx
import { Viewer, Worker } from "@react-pdf-viewer/core";
import { defaultLayoutPlugin } from "@react-pdf-viewer/default-layout";

interface PdfViewerProps {
  fileUrl: string;
  canDownload: boolean;
  canPrint: boolean;
}

export function PdfViewer({ fileUrl, canDownload, canPrint }: PdfViewerProps) {
  const defaultLayoutPluginInstance = defaultLayoutPlugin({
    toolbarPlugin: {
      downloadPlugin: {
        // Hide download button if not authorized
        renderDownloadButton: canDownload ? undefined : () => null,
      },
      printPlugin: {
        renderPrintButton: canPrint ? undefined : () => null,
      },
    },
  });

  return (
    <div className="h-full w-full pdf-viewer-container">
      <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js">
        <Viewer fileUrl={fileUrl} plugins={[defaultLayoutPluginInstance]} />
      </Worker>
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

- [ ] Install @react-pdf-viewer/core, mammoth.js
- [ ] Create PdfViewer component
- [ ] Create DocxViewer component
- [ ] Implement useCopyProtection hook
- [ ] Add watermark component
- [ ] Style viewer with Tailwind
- [ ] Create document view page
- [ ] Test on various document types
- [ ] Handle loading and error states

## Success Criteria

- PDF renders with zoom/navigation
- DOCX converts and displays cleanly
- Right-click disabled
- Ctrl+C/P blocked
- Text selection disabled
- Watermark visible on sensitive docs
- Download/print buttons hidden when not authorized

## Security Notes

- Watermark includes user identifier for traceability
- All document access logged
- Streaming prevents full file caching
- Canvas rendering for extra protection (advanced)

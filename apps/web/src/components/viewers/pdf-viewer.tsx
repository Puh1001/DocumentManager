'use client';

import { useState } from 'react';

interface PdfViewerProps {
  fileUrl: string;
  canDownload?: boolean;
  canPrint?: boolean;
}

export function PdfViewer({ fileUrl, canDownload, canPrint }: PdfViewerProps) {
  const [loading, setLoading] = useState(true);

  // Build URL with toolbar options
  let viewerUrl = fileUrl;
  
  // Disable download/print in PDF viewer if not authorized
  const toolbar = [];
  if (!canDownload) toolbar.push('nodownload');
  if (!canPrint) toolbar.push('noprint');
  
  if (toolbar.length > 0) {
    viewerUrl += `#toolbar=0`;
  }

  return (
    <div className="h-full w-full">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      )}
      
      <iframe
        src={viewerUrl}
        className="w-full h-full border-0"
        onLoad={() => setLoading(false)}
        title="PDF Viewer"
      />
    </div>
  );
}

/**
 * Note: For more advanced PDF viewing with better protection,
 * consider using @react-pdf-viewer/core:
 * 
 * import { Viewer, Worker } from '@react-pdf-viewer/core';
 * import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';
 * 
 * This provides:
 * - Full control over toolbar buttons
 * - Better rendering quality
 * - More customization options
 * - Support for password-protected PDFs
 */


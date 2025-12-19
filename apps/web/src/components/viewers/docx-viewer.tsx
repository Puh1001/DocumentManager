'use client';

import { useState, useEffect, useCallback } from 'react';

interface DocxViewerProps {
  fileUrl: string;
}

export function DocxViewer({ fileUrl }: DocxViewerProps) {
  const [html, setHtml] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDocx = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch the document
      const response = await fetch(fileUrl);
      if (!response.ok) {
        throw new Error('Failed to fetch document');
      }

      const arrayBuffer = await response.arrayBuffer();

      // Use mammoth to convert to HTML
      // Note: mammoth is loaded dynamically to reduce bundle size
      const mammoth = await import('mammoth');
      const result = await mammoth.convertToHtml({ arrayBuffer });
      
      setHtml(result.value);
    } catch (err) {
      console.error('Failed to load DOCX:', err);
      setError('Không thể tải tài liệu. Vui lòng thử lại.');
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


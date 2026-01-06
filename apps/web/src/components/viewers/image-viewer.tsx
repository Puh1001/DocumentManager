"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";

interface ImageViewerProps {
  fileUrl: string;
  alt: string;
}

export function ImageViewer({ fileUrl, alt }: ImageViewerProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch image with authentication and create blob URL
    let currentUrl: string | null = null;
    let isMounted = true;

    const loadImage = async () => {
      try {
        setLoading(true);
        setError(null);
        // Extract endpoint from fileUrl (remove /api prefix if present)
        const endpoint = fileUrl.startsWith("/api/")
          ? fileUrl.substring(4)
          : fileUrl;
        const url = await api.fetchFileAsBlobUrl(endpoint);
        if (!isMounted) {
          URL.revokeObjectURL(url);
          return;
        }
        currentUrl = url;
        setBlobUrl(url);
      } catch (err) {
        console.error("Failed to load image:", err);
        setError("Không thể tải hình ảnh. Vui lòng thử lại.");
      } finally {
        setLoading(false);
      }
    };

    loadImage();

    // Cleanup blob URL on unmount
    return () => {
      isMounted = false;
      if (currentUrl) {
        URL.revokeObjectURL(currentUrl);
      }
    };
  }, [fileUrl]);

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
        {error || "Không thể tải hình ảnh"}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-full">
      <img
        src={blobUrl}
        alt={alt}
        className="max-w-full max-h-full object-contain"
      />
    </div>
  );
}


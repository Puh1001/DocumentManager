"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  Download,
} from "lucide-react";

interface PptViewerProps {
  fileUrl: string;
  fileName: string;
}

/**
 * PPT/PPTX viewer with presentation mode (fullscreen + next/prev UI).
 * Renders file in iframe; fullscreen toggles fullscreen on container.
 * Slide-by-slide navigation would require a PPTX parser (e.g. server-side or dedicated lib).
 */
export function PptViewer({ fileUrl, fileName }: PptViewerProps) {
  const t = useTranslations("client");
  const containerRef = useRef<HTMLDivElement>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [slideIndex, setSlideIndex] = useState(0);
  const blobUrlRef = useRef<string | null>(null);

  const endpoint = fileUrl.startsWith("/api/")
    ? fileUrl.substring(4)
    : fileUrl;

  const loadFile = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
      const url = await api.fetchFileAsBlobUrl(endpoint);
      blobUrlRef.current = url;
      setBlobUrl(url);
    } catch (err) {
      console.error("Failed to load PPT:", err);
      setError(t("pptViewer.loadError"));
    } finally {
      setLoading(false);
    }
  }, [endpoint, t]);

  useEffect(() => {
    loadFile();
    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
      }
    };
  }, [loadFile]);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") setSlideIndex((i) => Math.max(0, i - 1));
    if (e.key === "ArrowRight") setSlideIndex((i) => i + 1);
  };

  if (loading) {
    return (
      <div className="flex h-[400px] items-center justify-center text-muted-foreground">
        {t("pptViewer.loading")}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[400px] items-center justify-center text-destructive">
        {error}
      </div>
    );
  }

  if (!blobUrl) return null;

  return (
    <div
      ref={containerRef}
      className="flex flex-col h-full min-h-[400px] rounded border bg-black/5"
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* Toolbar: presentation mode + prev/next */}
      <div className="flex items-center justify-between gap-2 border-b bg-background px-2 py-1.5">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSlideIndex((i) => Math.max(0, i - 1))}
            title={t("pptViewer.prevSlide")}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-xs text-muted-foreground px-1">
            {t("pptViewer.slideLabel", { n: slideIndex + 1 })}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSlideIndex((i) => i + 1)}
            title={t("pptViewer.nextSlide")}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleFullscreen}
            title={isFullscreen ? t("pptViewer.exitFullscreen") : t("pptViewer.fullscreen")}
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>
          <a
            href={blobUrl}
            download={fileName || "presentation.pptx"}
            className="inline-flex"
          >
            <Button variant="ghost" size="sm" title={t("pptViewer.download")}>
              <Download className="h-4 w-4" />
            </Button>
          </a>
        </div>
      </div>

      {/* Slide content: iframe (browser may render or prompt download) */}
      <div className="flex-1 min-h-0 relative bg-white">
        <iframe
          src={blobUrl}
          title={fileName}
          className="absolute inset-0 w-full h-full border-0"
        />
      </div>
    </div>
  );
}

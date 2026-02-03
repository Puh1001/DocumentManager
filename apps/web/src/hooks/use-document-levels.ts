"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import type { DocumentLevel } from "@/lib/types/document.types";

interface UseDocumentLevelsResult {
  levels: DocumentLevel[];
  loading: boolean;
  error: string | null;
}

export function useDocumentLevels(): UseDocumentLevelsResult {
  const [levelsRaw, setLevelsRaw] = useState<DocumentLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    api
      .get<DocumentLevel[]>("/storage/document-levels")
      .then((data) => {
        if (cancelled) return;
        setLevelsRaw(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (cancelled) return;
        setLevelsRaw([]);
        setError(err instanceof Error ? err.message : "Failed to load levels");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const levels = useMemo(() => {
    return levelsRaw
      .filter((l) => l.isActive !== false)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }, [levelsRaw]);

  return { levels, loading, error };
}

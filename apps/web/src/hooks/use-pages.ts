"use client";

import { useState } from "react";
import { getAllPages } from "@/lib/page-registry";
import type { PageMetadata } from "@/lib/types/page-metadata";

/**
 * Hook to get all registered pages from the page registry
 * Pages are already sorted by order in the registry
 *
 * @note Loading state is always false after mount since getAllPages() is synchronous.
 *       Kept for API consistency and future async support.
 *
 * @returns Object containing pages array and loading state
 *
 * @example
 * ```tsx
 * const { pages, loading } = usePages();
 * ```
 */
export function usePages(): {
  pages: PageMetadata[];
  loading: boolean;
} {
  const [pages] = useState<PageMetadata[]>(() => {
    // Initialize synchronously since getAllPages() is sync
    try {
      return getAllPages();
    } catch (error) {
      console.error("Failed to load pages from registry:", error);
      return [];
    }
  });

  // Loading is always false since getAllPages() is synchronous
  // But we keep it for API consistency and future async support
  const loading = false;

  return { pages, loading };
}

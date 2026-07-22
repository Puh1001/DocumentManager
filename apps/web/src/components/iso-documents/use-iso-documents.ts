"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useTranslations, useLocale } from "next-intl";
import { getErrorMessage } from "@/lib/error-handler";
import { useDocumentLevels } from "@/hooks/use-document-levels";
import type { Document } from "@/lib/types/document.types";
import {
  getDocumentLevelDisplayName,
  type DocumentLevel,
} from "@/lib/types/document.types";
import { fetchDocuments, type FetchDocumentsParams } from "./document-api";

export const ISO_LIMIT = 20;

export interface ColumnState {
  docs: Document[];
  total: number;
  totalPages: number;
  currentPage: number;
  loading: boolean;
}

export function makeColumn(): ColumnState {
  return { docs: [], total: 0, totalPages: 0, currentPage: 1, loading: false };
}

export interface UseIsoDocumentsOptions {
  /** When set, always filters by this department (no department select needed). */
  fixedDepartmentId?: string;
}

export interface UseIsoDocumentsReturn {
  levelFilter: string;
  setLevelFilter: (v: string) => void;
  departmentFilter: string;
  setDepartmentFilter: (v: string) => void;
  loading: boolean;
  error: string | null;
  allDocs: Document[];
  total: number;
  totalPages: number;
  currentPage: number;
  col13: ColumnState;
  col4: ColumnState;
  loadSingleColumn: (page: number) => Promise<void>;
  goColPage: (group: "13" | "4", page: number) => Promise<void>;
  handleRefresh: () => void;
  levelOptions: { value: string; label: string }[];
  levelsLoading: boolean;
}

export function useIsoDocuments(
  options?: UseIsoDocumentsOptions
): UseIsoDocumentsReturn {
  const fixedDepartmentId = options?.fixedDepartmentId;
  const tCommon = useTranslations("common");
  const tFilters = useTranslations("documents.filters");
  const locale = useLocale();
  const { levels, loading: levelsLoading } = useDocumentLevels();

  const [levelFilter, setLevelFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");

  // Resolve which department ID to use for API calls
  const effectiveDepartmentId = fixedDepartmentId ?? departmentFilter;

  // Single column (when level filter active)
  const [allDocs, setAllDocs] = useState<Document[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Split view columns (when no level filter)
  const [col13, setCol13] = useState<ColumnState>(makeColumn);
  const [col4, setCol4] = useState<ColumnState>(makeColumn);

  const buildParams = useCallback(
    (overrides: Partial<FetchDocumentsParams> & { page: number }): FetchDocumentsParams => ({
      departmentId: effectiveDepartmentId,
      level: levelFilter,
      ...overrides,
      limit: ISO_LIMIT,
    }),
    [effectiveDepartmentId, levelFilter]
  );

  const loadSingleColumn = useCallback(
    async (page: number) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchDocuments(buildParams({ page }));
        setAllDocs(res.data ?? []);
        setTotal(res.total ?? 0);
        setTotalPages(res.totalPages ?? 0);
        setCurrentPage(res.page ?? page);
      } catch (err) {
        setError(getErrorMessage(err, (key: string) => tCommon(key)));
        setAllDocs([]);
        setTotal(0);
        setTotalPages(0);
      } finally {
        setLoading(false);
      }
    },
    [buildParams, tCommon]
  );

  const loadColumn = useCallback(
    async (group: "13" | "4", page: number): Promise<ColumnState> => {
      try {
        const res = await fetchDocuments(buildParams({ levelGroup: group, page }));
        return {
          docs: res.data ?? [],
          total: res.total ?? 0,
          totalPages: res.totalPages ?? 0,
          currentPage: res.page ?? page,
          loading: false,
        };
      } catch {
        return { ...makeColumn(), loading: false };
      }
    },
    [buildParams]
  );

  // When level filter / dept filter changes, reset pagination
  useEffect(() => {
    if (!levelFilter) return;
    setCurrentPage(1);
  }, [levelFilter, departmentFilter]);

  useEffect(() => {
    if (!levelFilter) return;
    loadSingleColumn(currentPage);
  }, [currentPage, loadSingleColumn, levelFilter]);

  // Split view: reload when level filter changes or department filter changes
  useEffect(() => {
    if (levelFilter) return;

    setCol13((prev) => ({ ...prev, loading: true }));
    setCol4((prev) => ({ ...prev, loading: true }));

    let cancelled = false;
    Promise.all([loadColumn("13", 1), loadColumn("4", 1)]).then(
      ([r13, r4]) => {
        if (cancelled) return;
        setCol13(r13);
        setCol4(r4);
      }
    );

    return () => {
      cancelled = true;
    };
  }, [levelFilter, loadColumn]);

  const goColPage = async (group: "13" | "4", page: number) => {
    const setter = group === "13" ? setCol13 : setCol4;
    setter((prev) => ({ ...prev, loading: true }));
    const result = await loadColumn(group, page);
    setter(result);
  };

  const handleRefresh = () => {
    if (levelFilter) {
      loadSingleColumn(currentPage);
    } else {
      setCol13((prev) => ({ ...prev, loading: true }));
      setCol4((prev) => ({ ...prev, loading: true }));
      Promise.all([loadColumn("13", 1), loadColumn("4", 1)]).then(
        ([r13, r4]) => {
          setCol13(r13);
          setCol4(r4);
        }
      );
    }
  };

  const levelOptions = useMemo(() => {
    if (levelsLoading) return [{ value: "", label: tFilters("loadingLevels") }];
    const opts = [{ value: "", label: tFilters("levelAll") }];
    levels.forEach((level: DocumentLevel) => {
      opts.push({
        value: level.id,
        label: getDocumentLevelDisplayName(level, locale),
      });
    });
    return opts;
  }, [levels, levelsLoading, locale, tFilters]);

  return {
    levelFilter,
    setLevelFilter,
    departmentFilter,
    setDepartmentFilter,
    loading,
    error,
    allDocs,
    total,
    totalPages,
    currentPage,
    col13,
    col4,
    loadSingleColumn,
    goColPage,
    handleRefresh,
    levelOptions,
    levelsLoading,
  };
}

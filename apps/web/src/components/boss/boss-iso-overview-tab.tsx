"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
import { api } from "@/lib/api";
import {
  FileText,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  RefreshCw,
  ChevronDown,
} from "lucide-react";
import { getErrorMessage } from "@/lib/error-handler";
import { useDocumentLevels } from "@/hooks/use-document-levels";
import type { Document } from "@/lib/types/document.types";
import {
  getDocumentLevelDisplayName,
  type DocumentLevel,
} from "@/lib/types/document.types";
import type { Department } from "@/lib/api";

const LIMIT = 20;

interface BossIsoOverviewTabProps {
  departments: Department[];
  locale: string;
  onSelectDocument: (documentId: string) => void;
}

/** Split documents client-side: LEVEL1-3 vs LEVEL4 */
function splitByLevel(docs: Document[], levels: DocumentLevel[]): { level13: Document[]; level4: Document[] } {
  const level4Codes = new Set(["LEVEL4", "level4"]);
  // Get actual level codes from the levels array
  const l4Codes = new Set(levels.filter(l => l.code.toUpperCase() === "LEVEL4").map(l => l.code));
  const l13Codes = new Set(levels.filter(l => l.code.toUpperCase() !== "LEVEL4").map(l => l.code));

  const level13: Document[] = [];
  const level4: Document[] = [];

  for (const doc of docs) {
    const code = doc.level?.code ?? "";
    if (l4Codes.has(code) || code.toUpperCase() === "LEVEL4") {
      level4.push(doc);
    } else {
      level13.push(doc);
    }
  }

  return { level13, level4 };
}

export function BossIsoOverviewTab({
  departments,
  locale,
  onSelectDocument,
}: BossIsoOverviewTabProps) {
  const t = useTranslations("boss.isoOverview");
  const tFilters = useTranslations("documents.filters");
  const tCommon = useTranslations("common");
  const { levels, loading: levelsLoading } = useDocumentLevels();

  const [departmentFilter, setDepartmentFilter] = useState("");
  const [levelFilter, setLevelFilter] = useState("");

  // Single column (when level filter active)
  const [allDocs, setAllDocs] = useState<Document[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Two column split result (when no level filter)
  const splitDocs = useMemo(() => {
    if (levelFilter) return null;
    return splitByLevel(allDocs, levels);
  }, [allDocs, levels, levelFilter]);

  const loadDocuments = useCallback(
    async (page: number) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        params.append("page", page.toString());
        params.append("limit", LIMIT.toString());
        params.append("status", "ACTIVE");
        if (departmentFilter) params.append("departmentId", departmentFilter);
        if (levelFilter) params.append("level", levelFilter);

        const res = await api.get<{
          data: Document[];
          total: number;
          page: number;
          limit: number;
          totalPages: number;
        }>(`/storage/documents?${params.toString()}`);

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
    [departmentFilter, levelFilter, tCommon]
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [departmentFilter, levelFilter]);

  useEffect(() => {
    loadDocuments(currentPage);
  }, [currentPage, loadDocuments]);

  const handleRefresh = () => loadDocuments(currentPage);

  const levelOptions = useMemo(() => {
    if (levelsLoading) return [{ value: "", label: tFilters("loadingLevels") }];
    const opts = [{ value: "", label: tFilters("levelAll") }];
    levels.forEach((level: DocumentLevel) => {
      opts.push({ value: level.id, label: getDocumentLevelDisplayName(level, locale) });
    });
    return opts;
  }, [levels, levelsLoading, locale, tFilters]);

  return (
    <div className="space-y-6">
      {/* Filter bar */}
      <div className="cyber-card cyber-corner p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="grid gap-1.5 min-w-0 flex-1 min-w-[140px]">
            <label htmlFor="boss-iso-dept" className="text-xs font-cyber text-cyan-400/80">{tFilters("department")}</label>
            <div className="relative">
              <select
                id="boss-iso-dept" aria-label={tFilters("department")}
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="cyber-input w-full min-w-[160px] max-w-[220px] h-10 rounded-lg border border-cyan-500/40 bg-cyan-500/5 px-3 pr-9 text-sm text-cyan-100 font-cyber cursor-pointer appearance-none focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              >
                <option value="">{tFilters("all")}</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-cyan-400/70 pointer-events-none" />
            </div>
          </div>
          <div className="grid gap-1.5 min-w-0 flex-1 min-w-[140px]">
            <label htmlFor="boss-iso-level" className="text-xs font-cyber text-cyan-400/80">{tFilters("level")}</label>
            <div className="relative">
              <select
                id="boss-iso-level" aria-label={tFilters("level")}
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value)}
                disabled={levelsLoading}
                className="cyber-input w-full min-w-[160px] max-w-[220px] h-10 rounded-lg border border-cyan-500/40 bg-cyan-500/5 px-3 pr-9 text-sm text-cyan-100 font-cyber cursor-pointer appearance-none focus:outline-none focus:ring-2 focus:ring-cyan-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {levelOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-cyan-400/70 pointer-events-none" />
            </div>
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={loading}
            className="cyber-button h-10 px-4 py-2 font-cyber text-sm flex items-center gap-2 cursor-pointer disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f0f1a]"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            {t("refresh")}
          </button>
        </div>
        {!levelFilter && (
          <p className="mt-2 text-[11px] text-cyan-400/60 font-cyber">
            LEVEL 1-3 &middot; LEVEL 4
          </p>
        )}
      </div>

      {error && (
        <div className="cyber-card p-6 cyber-corner">
          <div className="text-center text-fuchsia-400 cyber-text-glow">
            <p className="font-cyber font-semibold text-lg">{t("errorLoad")}</p>
            <p className="text-sm mt-2 text-cyan-300/90">{error}</p>
          </div>
        </div>
      )}

      {!error && (
        <>
          {levelFilter ? (
            /* Single column when filtering by a specific level */
            <div className="cyber-card cyber-corner p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 rounded-lg bg-cyan-500/15 border border-cyan-500/30">
                  <FileText className="h-8 w-8 text-cyan-400" />
                </div>
                <div>
                  <p className="text-2xl font-cyber font-bold cyber-neon-cyan">{total}</p>
                  <p className="text-sm text-cyan-400/80 font-cyber">{t("totalDocuments")}</p>
                </div>
              </div>

              {loading ? (
                <div className="flex justify-center py-12">
                  <div className="relative">
                    <div className="animate-spin rounded-full h-10 w-10 border-2 border-cyan-500/30 border-t-cyan-500" />
                  </div>
                </div>
              ) : allDocs.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-16 w-16 mx-auto mb-4 text-cyan-500/50 cyber-text-glow" />
                  <p className="text-xl font-cyber font-semibold cyber-neon-cyan">{t("noDocuments")}</p>
                  <p className="text-sm mt-2 text-cyan-400/60 font-cyber">{t("noDocumentsHint")}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {allDocs.map((doc, index) => (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => onSelectDocument(doc.id)}
                      className="flex items-center gap-4 p-4 border border-cyan-500/20 rounded-lg hover:border-cyan-500/40 hover:bg-cyan-500/5 transition-colors duration-200 cursor-pointer group cyber-corner w-full text-left"
                      style={{ animationDelay: `${index * 0.05}s` }}
                    >
                      <div className="flex-shrink-0 p-2 rounded bg-cyan-500/10 text-cyan-400">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-cyber font-semibold text-cyan-100 truncate">{doc.name}</p>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-cyan-400/80 font-cyber">
                          {doc.documentNo && <span>{doc.documentNo}</span>}
                          {doc.folder?.department && (
                            <span>{doc.folder.department.name || doc.folder.department.code}</span>
                          )}
                          {doc.level && <span>{getDocumentLevelDisplayName(doc.level, locale)}</span>}
                          <span>{doc.updatedAt ? new Date(doc.updatedAt).toLocaleDateString(locale) : ""}</span>
                        </div>
                      </div>
                      <ExternalLink className="h-4 w-4 text-cyan-400/70 group-hover:text-cyan-400 flex-shrink-0" />
                    </button>
                  ))}
                </div>
              )}

              {!loading && totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t border-cyan-500/20">
                  <p className="text-sm text-cyan-400/80 font-cyber">
                    {t("paginationSummary", {
                      from: (currentPage - 1) * LIMIT + 1,
                      to: Math.min(currentPage * LIMIT, total),
                      total,
                    })}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="cyber-button p-2 rounded disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="text-sm font-cyber text-cyan-300 px-2">{currentPage} / {totalPages}</span>
                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="cyber-button p-2 rounded disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Two columns view: LEVEL1-3 (left) | LEVEL4 (right) */
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Column 1: LEVEL1-3 */}
              <div className="cyber-card cyber-corner p-5 flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-cyan-500/15 border border-cyan-500/30">
                    <FileText className="h-6 w-6 text-cyan-400" />
                  </div>
                  <div>
                    <p className="text-lg font-cyber font-bold cyber-neon-cyan">{splitDocs?.level13.length ?? 0}</p>
                    <p className="text-xs text-cyan-400/80 font-cyber">LEVEL 1-3</p>
                  </div>
                </div>

                {loading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-cyan-500/30 border-t-cyan-500" />
                  </div>
                ) : (splitDocs?.level13.length ?? 0) === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 mx-auto mb-3 text-cyan-500/50 cyber-text-glow" />
                    <p className="text-base font-cyber font-semibold cyber-neon-cyan">{t("noDocuments")}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {splitDocs?.level13.map((doc) => (
                      <button
                        key={doc.id}
                        type="button"
                        onClick={() => onSelectDocument(doc.id)}
                        className="flex items-center gap-3 p-3 border border-cyan-500/20 rounded-lg hover:border-cyan-500/40 hover:bg-cyan-500/5 transition-colors duration-200 cursor-pointer group cyber-corner w-full text-left"
                      >
                        <div className="flex-shrink-0 p-1.5 rounded bg-cyan-500/10 text-cyan-400">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-cyber font-semibold text-cyan-100 truncate text-sm">{doc.name}</p>
                          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5 text-[11px] text-cyan-400/80 font-cyber">
                            {doc.documentNo && <span>{doc.documentNo}</span>}
                            {doc.folder?.department && (
                              <span>{doc.folder.department.name || doc.folder.department.code}</span>
                            )}
                            {doc.level && <span>{getDocumentLevelDisplayName(doc.level, locale)}</span>}
                          </div>
                        </div>
                        <ExternalLink className="h-3.5 w-3.5 text-cyan-400/70 group-hover:text-cyan-400 flex-shrink-0" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Column 2: LEVEL4 */}
              <div className="cyber-card cyber-corner p-5 flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-teal-500/15 border border-teal-500/30">
                    <FileText className="h-6 w-6 text-teal-400" />
                  </div>
                  <div>
                    <p className="text-lg font-cyber font-bold cyber-neon-cyan">{splitDocs?.level4.length ?? 0}</p>
                    <p className="text-xs text-cyan-400/80 font-cyber">LEVEL 4</p>
                  </div>
                </div>

                {loading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-cyan-500/30 border-t-cyan-500" />
                  </div>
                ) : (splitDocs?.level4.length ?? 0) === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 mx-auto mb-3 text-cyan-500/50 cyber-text-glow" />
                    <p className="text-base font-cyber font-semibold cyber-neon-cyan">{t("noDocuments")}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {splitDocs?.level4.map((doc) => (
                      <button
                        key={doc.id}
                        type="button"
                        onClick={() => onSelectDocument(doc.id)}
                        className="flex items-center gap-3 p-3 border border-teal-500/20 rounded-lg hover:border-teal-500/40 hover:bg-teal-500/5 transition-colors duration-200 cursor-pointer group cyber-corner w-full text-left"
                      >
                        <div className="flex-shrink-0 p-1.5 rounded bg-teal-500/10 text-teal-400">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-cyber font-semibold text-cyan-100 truncate text-sm">{doc.name}</p>
                          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5 text-[11px] text-cyan-400/80 font-cyber">
                            {doc.documentNo && <span>{doc.documentNo}</span>}
                            {doc.folder?.department && (
                              <span>{doc.folder.department.name || doc.folder.department.code}</span>
                            )}
                            {doc.level && <span>{getDocumentLevelDisplayName(doc.level, locale)}</span>}
                          </div>
                        </div>
                        <ExternalLink className="h-3.5 w-3.5 text-cyan-400/70 group-hover:text-cyan-400 flex-shrink-0" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Pagination for single-column (level filter active) */}
          {!loading && levelFilter && totalPages > 1 && (
            <div className="cyber-card cyber-corner px-6 py-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-cyan-400/80 font-cyber">
                  {t("paginationSummary", {
                    from: (currentPage - 1) * LIMIT + 1,
                    to: Math.min(currentPage * LIMIT, total),
                    total,
                  })}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="cyber-button p-2 rounded disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-sm font-cyber text-cyan-300 px-2">{currentPage} / {totalPages}</span>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="cyber-button p-2 rounded disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState, useCallback } from "react";
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
  /** Called when user clicks a row; opens document in Boss UI (DocumentDetail). */
  onSelectDocument: (documentId: string) => void;
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

  const [documents, setDocuments] = useState<Document[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [levelFilter, setLevelFilter] = useState("");

  const loadDocuments = useCallback(
    async (page: number) => {
      try {
        setLoading(true);
        setError(null);
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

        setDocuments(res.data ?? []);
        setTotal(res.total ?? 0);
        setTotalPages(res.totalPages ?? 0);
        setCurrentPage(res.page ?? page);
      } catch (err) {
        console.error("Failed to load ISO documents:", err);
        setError(getErrorMessage(err, (key: string) => tCommon(key)));
        setDocuments([]);
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

  const handleRefresh = () => {
    loadDocuments(currentPage);
  };

  return (
    <div className="space-y-6">
      {/* Filter bar - cyber style */}
      <div className="cyber-card cyber-corner p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="grid gap-1.5 min-w-0 flex-1 min-w-[140px]">
            <label
              htmlFor="boss-iso-dept"
              className="text-xs font-cyber text-cyan-400/80"
            >
              {tFilters("department")}
            </label>
            <div className="relative">
              <select
                id="boss-iso-dept"
                aria-label={tFilters("department")}
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="cyber-input w-full min-w-[160px] max-w-[220px] h-10 rounded-lg border border-cyan-500/40 bg-cyan-500/5 px-3 pr-9 text-sm text-cyan-100 font-cyber cursor-pointer appearance-none focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              >
                <option value="">{tFilters("all")}</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-cyan-400/70 pointer-events-none" />
            </div>
          </div>
          <div className="grid gap-1.5 min-w-0 flex-1 min-w-[140px]">
            <label
              htmlFor="boss-iso-level"
              className="text-xs font-cyber text-cyan-400/80"
            >
              {tFilters("level")}
            </label>
            <div className="relative">
              <select
                id="boss-iso-level"
                aria-label={tFilters("level")}
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value)}
                disabled={levelsLoading}
                className="cyber-input w-full min-w-[160px] max-w-[220px] h-10 rounded-lg border border-cyan-500/40 bg-cyan-500/5 px-3 pr-9 text-sm text-cyan-100 font-cyber cursor-pointer appearance-none focus:outline-none focus:ring-2 focus:ring-cyan-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {levelsLoading ? (
                  <option value="">{tFilters("loadingLevels")}</option>
                ) : (
                  <option value="">{tFilters("levelAll")}</option>
                )}
                {!levelsLoading &&
                  levels.map((level: DocumentLevel) => (
                    <option key={level.id} value={level.id}>
                      {getDocumentLevelDisplayName(level, locale)}
                    </option>
                  ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-cyan-400/70 pointer-events-none" />
            </div>
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={loading}
            className="cyber-button h-10 px-4 py-2 font-cyber text-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            {t("refresh")}
          </button>
        </div>
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
        <div className="cyber-card cyber-corner p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 rounded-lg bg-cyan-500/15 border border-cyan-500/30">
              <FileText className="h-8 w-8 text-cyan-400" />
            </div>
            <div>
              <p className="text-2xl font-cyber font-bold cyber-neon-cyan">
                {total}
              </p>
              <p className="text-sm text-cyan-400/80 font-cyber">
                {t("totalDocuments")}
              </p>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="relative">
                <div className="animate-spin rounded-full h-10 w-10 border-2 border-cyan-500/30 border-t-cyan-500" />
              </div>
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-16 w-16 mx-auto mb-4 text-cyan-500/50 cyber-text-glow" />
              <p className="text-xl font-cyber font-semibold cyber-neon-cyan">
                {t("noDocuments")}
              </p>
              <p className="text-sm mt-2 text-cyan-400/60 font-cyber">
                {t("noDocumentsHint")}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map((doc, index) => {
                const handleClick = () => onSelectDocument(doc.id);
                return (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={handleClick}
                    className="flex items-center gap-4 p-4 border border-cyan-500/20 rounded-lg hover:border-cyan-500/40 hover:bg-cyan-500/5 transition-all duration-200 cursor-pointer group cyber-corner w-full text-left"
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <div className="flex-shrink-0 p-2 rounded bg-cyan-500/10 text-cyan-400">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-cyber font-semibold text-cyan-100 truncate">
                        {doc.name}
                      </p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-cyan-400/80 font-cyber">
                        {doc.documentNo && <span>{doc.documentNo}</span>}
                        {doc.folder?.department && (
                          <span>
                            {doc.folder.department.name ||
                              doc.folder.department.code}
                          </span>
                        )}
                        {doc.level && (
                          <span>
                            {getDocumentLevelDisplayName(doc.level, locale)}
                          </span>
                        )}
                        <span>
                          {doc.updatedAt
                            ? new Date(doc.updatedAt).toLocaleDateString(locale)
                            : ""}
                        </span>
                      </div>
                    </div>
                    <ExternalLink className="h-4 w-4 text-cyan-400/70 group-hover:text-cyan-400 flex-shrink-0" />
                  </button>
                );
              })}
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
                <span className="text-sm font-cyber text-cyan-300 px-2">
                  {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="cyber-button p-2 rounded disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

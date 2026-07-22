"use client";

import { type Department } from "@/lib/api";
import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { useIsoDocuments } from "@/components/iso-documents/use-iso-documents";
import { IsoDocumentsFilterBar } from "@/components/iso-documents/iso-documents-filter-bar";
import { IsoDocumentsSingleView } from "@/components/iso-documents/iso-documents-single-view";
import { IsoDocumentsSplitView } from "@/components/iso-documents/iso-documents-split-view";

interface BossIsoOverviewTabProps {
  departments: Department[];
  locale: string;
  onSelectDocument: (documentId: string) => void;
}

export function BossIsoOverviewTab({
  departments,
  locale,
  onSelectDocument,
}: BossIsoOverviewTabProps) {
  const tFilters = useTranslations("documents.filters");
  const tIso = useTranslations("boss.isoOverview");

  const {
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
  } = useIsoDocuments();

  const departmentHeader = (
    <div className="grid gap-1.5 min-w-0 flex-1 min-w-[140px]">
      <label htmlFor="boss-iso-dept" className="text-xs font-cyber text-cyan-400/80">
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
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-cyan-400/70 pointer-events-none" />
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <IsoDocumentsFilterBar
        levelFilter={levelFilter}
        onLevelChange={setLevelFilter}
        levelOptions={levelOptions}
        levelsLoading={levelsLoading}
        loading={loading}
        col13Loading={col13.loading}
        col4Loading={col4.loading}
        onRefresh={handleRefresh}
        header={departmentHeader}
        levelLabel={tFilters("level")}
        refreshLabel={tIso("refresh")}
      />

      {levelFilter ? (
        <IsoDocumentsSingleView
          total={total}
          loading={loading}
          docs={allDocs}
          error={error}
          currentPage={currentPage}
          totalPages={totalPages}
          locale={locale}
          onSelectDocument={onSelectDocument}
          onPageChange={(page) => loadSingleColumn(page)}
        />
      ) : (
        <IsoDocumentsSplitView
          col13={col13}
          col4={col4}
          locale={locale}
          onSelectDocument={onSelectDocument}
          onColumnPageChange={goColPage}
        />
      )}
    </div>
  );
}

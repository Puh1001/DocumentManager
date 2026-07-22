"use client";

import { ArrowLeft } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { useIsoDocuments } from "@/components/iso-documents/use-iso-documents";
import { IsoDocumentsFilterBar } from "@/components/iso-documents/iso-documents-filter-bar";
import { IsoDocumentsSingleView } from "@/components/iso-documents/iso-documents-single-view";
import { IsoDocumentsSplitView } from "@/components/iso-documents/iso-documents-split-view";

interface DocumentsListProps {
  departmentId: string;
  departmentName: string;
  onSelectDocument: (documentId: string) => void;
  onBack: () => void;
}

export function DocumentsList({
  departmentId,
  departmentName: _departmentName,
  onSelectDocument,
  onBack,
}: DocumentsListProps) {
  const t = useTranslations("boss");
  const tFilters = useTranslations("documents.filters");
  const locale = useLocale();

  const {
    levelFilter,
    setLevelFilter,
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
  } = useIsoDocuments({ fixedDepartmentId: departmentId });

  return (
    <div className="space-y-6">
      {/* Back button */}
      <button
        onClick={onBack}
        className="cyber-button px-4 py-2 font-cyber text-sm flex items-center gap-2 cursor-pointer"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("actions.back")}
      </button>

      <IsoDocumentsFilterBar
        levelFilter={levelFilter}
        onLevelChange={setLevelFilter}
        levelOptions={levelOptions}
        levelsLoading={levelsLoading}
        loading={loading}
        col13Loading={col13.loading}
        col4Loading={col4.loading}
        onRefresh={handleRefresh}
        levelLabel={tFilters("level")}
        refreshLabel={t("isoOverview.refresh")}
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

"use client";

import { FileText, ChevronLeft, ChevronRight } from "lucide-react";
import { IsoDocumentCard } from "./iso-document-card";
import { ISO_LIMIT, type ColumnState } from "./use-iso-documents";

interface IsoDocumentsSplitViewProps {
  col13: ColumnState;
  col4: ColumnState;
  locale: string;
  onSelectDocument: (id: string) => void;
  onColumnPageChange: (group: "13" | "4", page: number) => void;
}

function SplitColumn({
  column,
  group,
  label,
  color,
  locale,
  onSelectDocument,
  onColumnPageChange,
}: {
  column: ColumnState;
  group: "13" | "4";
  label: string;
  color: "cyan" | "teal";
  locale: string;
  onSelectDocument: (id: string) => void;
  onColumnPageChange: (group: "13" | "4", page: number) => void;
}) {
  const borderStyle =
    color === "teal"
      ? "border-teal-500/30"
      : "border-cyan-500/30";
  const bgStyle =
    color === "teal"
      ? "bg-teal-500/15"
      : "bg-cyan-500/15";
  const textStyle = color === "teal" ? "text-teal-400" : "text-cyan-400";

  return (
    <div className="cyber-card cyber-corner p-5 flex-1 min-w-0">
      <div className="flex items-center gap-3 mb-4">
        <div className={`p-2 rounded-lg ${bgStyle} ${borderStyle}`}>
          <FileText className={`h-6 w-6 ${textStyle}`} />
        </div>
        <div>
          <p className="text-lg font-cyber font-bold cyber-neon-cyan">
            {column.total}
          </p>
          <p className="text-xs text-cyan-400/80 font-cyber">{label}</p>
        </div>
      </div>

      {column.loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-cyan-500/30 border-t-cyan-500" />
        </div>
      ) : column.docs.length === 0 ? (
        <div className="text-center py-8">
          <FileText className="h-12 w-12 mx-auto mb-3 text-cyan-500/50 cyber-text-glow" />
          <p className="text-base font-cyber font-semibold cyber-neon-cyan">
            No ISO documents
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {column.docs.map((doc) => (
              <IsoDocumentCard
                key={doc.id}
                doc={doc}
                locale={locale}
                onSelect={onSelectDocument}
                color={color}
              />
            ))}
          </div>
          {column.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-cyan-500/20">
              <p className="text-[11px] text-cyan-400/70 font-cyber">
                {(column.currentPage - 1) * ISO_LIMIT + 1}–
                {Math.min(column.currentPage * ISO_LIMIT, column.total)} /{" "}
                {column.total}
              </p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() =>
                    onColumnPageChange(group, column.currentPage - 1)
                  }
                  disabled={column.currentPage === 1}
                  className="cyber-button p-1.5 rounded disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <span className="text-xs font-cyber text-cyan-300 px-1">
                  {column.currentPage}/{column.totalPages}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    onColumnPageChange(group, column.currentPage + 1)
                  }
                  disabled={column.currentPage === column.totalPages}
                  className="cyber-button p-1.5 rounded disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export function IsoDocumentsSplitView({
  col13,
  col4,
  locale,
  onSelectDocument,
  onColumnPageChange,
}: IsoDocumentsSplitViewProps) {
  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <SplitColumn
        column={col13}
        group="13"
        label="LEVEL 1-3"
        color="cyan"
        locale={locale}
        onSelectDocument={onSelectDocument}
        onColumnPageChange={onColumnPageChange}
      />
      <SplitColumn
        column={col4}
        group="4"
        label="LEVEL 4"
        color="teal"
        locale={locale}
        onSelectDocument={onSelectDocument}
        onColumnPageChange={onColumnPageChange}
      />
    </div>
  );
}

"use client";

import { FileText, ChevronLeft, ChevronRight } from "lucide-react";
import type { Document } from "@/lib/types/document.types";
import { ISO_LIMIT } from "./use-iso-documents";

interface IsoDocumentsSingleViewProps {
  total: number;
  loading: boolean;
  docs: Document[];
  error: string | null;
  currentPage: number;
  totalPages: number;
  locale: string;
  onSelectDocument: (id: string) => void;
  onPageChange: (page: number) => void;
}

export function IsoDocumentsSingleView({
  total,
  loading,
  docs,
  error,
  currentPage,
  totalPages,
  locale,
  onSelectDocument,
  onPageChange,
}: IsoDocumentsSingleViewProps) {
  if (error) {
    return (
      <div className="cyber-card p-6 cyber-corner">
        <div className="text-center text-fuchsia-400 cyber-text-glow">
          <p className="font-cyber font-semibold text-lg">Failed to load documents</p>
          <p className="text-sm mt-2 text-cyan-300/90">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="cyber-card cyber-corner p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 rounded-lg bg-cyan-500/15 border border-cyan-500/30">
          <FileText className="h-8 w-8 text-cyan-400" />
        </div>
        <div>
          <p className="text-2xl font-cyber font-bold cyber-neon-cyan">{total}</p>
          <p className="text-sm text-cyan-400/80 font-cyber">Total documents</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="relative">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-cyan-500/30 border-t-cyan-500" />
          </div>
        </div>
      ) : docs.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="h-16 w-16 mx-auto mb-4 text-cyan-500/50 cyber-text-glow" />
          <p className="text-xl font-cyber font-semibold cyber-neon-cyan">
            No ISO documents
          </p>
          <p className="text-sm mt-2 text-cyan-400/60 font-cyber">
            Try changing filters or ensure documents exist.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {docs.map((doc, index) => (
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
                <p className="font-cyber font-semibold text-cyan-100 truncate">
                  {doc.name}
                </p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-cyan-400/80 font-cyber">
                  {doc.documentNo && <span>{doc.documentNo}</span>}
                  {doc.folder?.department && (
                    <span>
                      {doc.folder.department.name || doc.folder.department.code}
                    </span>
                  )}
                  {doc.level && (
                    <span>{doc.level.name}</span>
                  )}
                  <span>
                    {doc.updatedAt
                      ? new Date(doc.updatedAt).toLocaleDateString(locale)
                      : ""}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-cyan-500/20">
          <p className="text-sm text-cyan-400/80 font-cyber">
            {(currentPage - 1) * ISO_LIMIT + 1}–
            {Math.min(currentPage * ISO_LIMIT, total)} / {total}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
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
              onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="cyber-button p-2 rounded disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

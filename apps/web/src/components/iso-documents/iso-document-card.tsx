"use client";

import { FileText, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Document } from "@/lib/types/document.types";
import { getDocumentLevelDisplayName } from "@/lib/types/document.types";

interface IsoDocumentCardProps {
  doc: Document;
  locale: string;
  onSelect: (documentId: string) => void;
  /** Color accent: "cyan" (default) or "teal" */
  color?: "cyan" | "teal";
}

const colorStyles = {
  cyan: {
    border: "border-cyan-500/20 hover:border-cyan-500/40 hover:bg-cyan-500/5",
    icon: "bg-cyan-500/10 text-cyan-400",
    iconColor: "text-cyan-400/70 group-hover:text-cyan-400",
  },
  teal: {
    border: "border-teal-500/20 hover:border-teal-500/40 hover:bg-teal-500/5",
    icon: "bg-teal-500/10 text-teal-400",
    iconColor: "text-teal-400/70 group-hover:text-teal-400",
  },
};

export function IsoDocumentCard({
  doc,
  locale,
  onSelect,
  color = "cyan",
}: IsoDocumentCardProps) {
  const styles = colorStyles[color];

  return (
    <button
      type="button"
      onClick={() => onSelect(doc.id)}
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg transition-colors duration-200 cursor-pointer group cyber-corner w-full text-left",
        styles.border
      )}
    >
      <div className={cn("flex-shrink-0 p-1.5 rounded", styles.icon)}>
        <FileText className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-cyber font-semibold text-cyan-100 truncate text-sm">
          {doc.name}
        </p>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5 text-[11px] text-cyan-400/80 font-cyber">
          {doc.documentNo && <span>{doc.documentNo}</span>}
          {doc.folder?.department && (
            <span>
              {doc.folder.department.name || doc.folder.department.code}
            </span>
          )}
          {doc.level && (
            <span>{getDocumentLevelDisplayName(doc.level, locale)}</span>
          )}
        </div>
      </div>
      <ExternalLink className={cn("h-3.5 w-3.5 flex-shrink-0", styles.iconColor)} />
    </button>
  );
}

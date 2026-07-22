"use client";

import { RefreshCw, ChevronDown } from "lucide-react";

interface IsoDocumentsFilterBarProps {
  levelFilter: string;
  onLevelChange: (value: string) => void;
  levelOptions: { value: string; label: string }[];
  levelsLoading: boolean;
  loading: boolean;
  col13Loading: boolean;
  col4Loading: boolean;
  onRefresh: () => void;
  header?: React.ReactNode;
  /** Default: "Level" */
  levelLabel?: string;
  /** Default: "Refresh" */
  refreshLabel?: string;
}

export function IsoDocumentsFilterBar({
  levelFilter,
  onLevelChange,
  levelOptions,
  levelsLoading,
  loading,
  col13Loading,
  col4Loading,
  onRefresh,
  header,
  levelLabel = "Level",
  refreshLabel = "Refresh",
}: IsoDocumentsFilterBarProps) {
  return (
    <div className="cyber-card cyber-corner p-4">
      <div className="flex flex-wrap items-end gap-4">
        {header}
        <div className="grid gap-1.5 min-w-0 flex-1 min-w-[140px]">
          <label
            htmlFor="iso-level-filter"
            className="text-xs font-cyber text-cyan-400/80"
          >
            {levelLabel}
          </label>
          <div className="relative">
            <select
              id="iso-level-filter"
              aria-label={levelLabel}
              value={levelFilter}
              onChange={(e) => onLevelChange(e.target.value)}
              disabled={levelsLoading}
              className="cyber-input w-full min-w-[160px] max-w-[220px] h-10 rounded-lg border border-cyan-500/40 bg-cyan-500/5 px-3 pr-9 text-sm text-cyan-100 font-cyber cursor-pointer appearance-none focus:outline-none focus:ring-2 focus:ring-cyan-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {levelOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-cyan-400/70 pointer-events-none" />
          </div>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading || col13Loading || col4Loading}
          className="cyber-button h-10 px-4 py-2 font-cyber text-sm flex items-center gap-2 cursor-pointer disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f0f1a]"
        >
          <RefreshCw
            className={`h-4 w-4 ${loading || col13Loading || col4Loading ? "animate-spin" : ""}`}
          />
          {refreshLabel}
        </button>
      </div>
      {!levelFilter && (
        <p className="mt-2 text-[11px] text-cyan-400/60 font-cyber">
          LEVEL 1-3 &middot; LEVEL 4
        </p>
      )}
    </div>
  );
}

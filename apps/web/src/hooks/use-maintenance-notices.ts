"use client";

import { useCallback, useEffect, useState } from "react";

export interface MaintenanceNotice {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  createdAt: string;
}

const STORAGE_KEY = "maintenance-notices";

const defaultNotices: MaintenanceNotice[] = [
  {
    id: "sample-1",
    title: "Line A scheduled check",
    description: "Inspect conveyor belts and recalibrate sensors.",
    startDate: "2025-01-05",
    endDate: "2025-01-05",
    createdAt: "2024-12-20T03:00:00.000Z",
  },
  {
    id: "sample-2",
    title: "Generator oil change",
    description: "Standby generator offline for 2 hours.",
    startDate: "2025-01-08",
    endDate: "2025-01-08",
    createdAt: "2024-12-21T03:00:00.000Z",
  },
];

const sortNotices = (items: MaintenanceNotice[]) =>
  [...items].sort(
    (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
  );

const parseStored = (raw: string | null): MaintenanceNotice[] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((item) => ({
        id: String(item.id),
        title: String(item.title ?? ""),
        description: String(item.description ?? ""),
        startDate: String(item.startDate ?? ""),
        endDate: String(item.endDate ?? ""),
        createdAt: String(item.createdAt ?? new Date().toISOString()),
      }))
      .filter((item) => item.title && item.startDate && item.endDate);
  } catch (error) {
    console.error("Failed to parse maintenance notices", error);
    return [];
  }
};

export function useMaintenanceNotices() {
  const [notices, setNotices] = useState<MaintenanceNotice[]>(defaultNotices);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const persistNotices = useCallback((next: MaintenanceNotice[]) => {
    setNotices(sortNotices(next));
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const stored = parseStored(localStorage.getItem(STORAGE_KEY));
      if (stored.length > 0) {
        setNotices(sortNotices(stored));
      } else {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultNotices));
      }
    } catch (err) {
      console.error("Unable to load maintenance notices", err);
      setError("Unable to load maintenance notices");
    } finally {
      setLoading(false);
    }
  }, []);

  const addNotice = useCallback(
    (input: Omit<MaintenanceNotice, "id" | "createdAt">): MaintenanceNotice => {
      const newNotice: MaintenanceNotice = {
        ...input,
        id:
          typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : `notice-${Date.now()}`,
        createdAt: new Date().toISOString(),
      };

      persistNotices([...notices, newNotice]);
      return newNotice;
    },
    [notices, persistNotices]
  );

  return {
    notices: sortNotices(notices),
    addNotice,
    loading,
    error,
  };
}

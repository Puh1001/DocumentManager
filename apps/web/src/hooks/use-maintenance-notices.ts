"use client";

import { useCallback, useEffect, useState } from "react";
import {
  MaintenanceNotice,
  maintenanceApi,
  CreateMaintenanceNoticeDto,
  UpdateMaintenanceNoticeDto,
} from "@/lib/api";

const sortNotices = (items: MaintenanceNotice[]) =>
  [...items].sort(
    (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
  );

export function useMaintenanceNotices() {
  const [notices, setNotices] = useState<MaintenanceNotice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadNotices = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await maintenanceApi.getAll();
      setNotices(data);
    } catch (err) {
      console.error("Failed to load maintenance notices", err);
      setError("Failed to load maintenance notices");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotices();
  }, [loadNotices]);

  const addNotice = useCallback(
    async (input: CreateMaintenanceNoticeDto): Promise<MaintenanceNotice> => {
      try {
        const newNotice = await maintenanceApi.create(input);
        await loadNotices();
        return newNotice;
      } catch (err) {
        console.error("Failed to create maintenance notice", err);
        throw err;
      }
    },
    [loadNotices]
  );

  const updateNotice = useCallback(
    async (
      id: string,
      updates: UpdateMaintenanceNoticeDto
    ): Promise<MaintenanceNotice | null> => {
      try {
        const updated = await maintenanceApi.update(id, updates);
        await loadNotices();
        return updated;
      } catch (err) {
        console.error("Failed to update maintenance notice", err);
        throw err;
      }
    },
    [loadNotices]
  );

  const deleteNotice = useCallback(
    async (id: string): Promise<void> => {
      try {
        await maintenanceApi.delete(id);
        await loadNotices();
      } catch (err) {
        console.error("Failed to delete maintenance notice", err);
        throw err;
      }
    },
    [loadNotices]
  );

  return {
    notices: sortNotices(notices),
    addNotice,
    updateNotice,
    deleteNotice,
    loading,
    error,
    refresh: loadNotices,
  };
}

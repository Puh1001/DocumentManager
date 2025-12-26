"use client";

import { useState, useCallback } from "react";
import { type Department } from "@/lib/api";

export type ViewType = "kpi" | "maintenance" | "documents" | null;

export interface BossNavigationState {
  selectedDepartment: Department | null;
  viewType: ViewType;
  selectedItemId: string | null;
}

export function useBossNavigation() {
  const [state, setState] = useState<BossNavigationState>({
    selectedDepartment: null,
    viewType: null,
    selectedItemId: null,
  });

  const selectDepartment = useCallback((department: Department) => {
    setState({
      selectedDepartment: department,
      viewType: null,
      selectedItemId: null,
    });
  }, []);

  const selectView = useCallback((viewType: ViewType) => {
    setState((prev) => ({
      ...prev,
      viewType,
      selectedItemId: null,
    }));
  }, []);

  const selectItem = useCallback((itemId: string | null) => {
    setState((prev) => ({
      ...prev,
      selectedItemId: itemId,
    }));
  }, []);

  const goBack = useCallback(() => {
    setState((prev) => {
      if (prev.selectedItemId) {
        // Go back from detail to list
        return {
          ...prev,
          selectedItemId: null,
        };
      } else if (prev.viewType) {
        // Go back from list to view selector
        return {
          ...prev,
          viewType: null,
          selectedItemId: null,
        };
      } else if (prev.selectedDepartment) {
        // Go back from view selector to department grid
        return {
          selectedDepartment: null,
          viewType: null,
          selectedItemId: null,
        };
      }
      return prev;
    });
  }, []);

  const reset = useCallback(() => {
    setState({
      selectedDepartment: null,
      viewType: null,
      selectedItemId: null,
    });
  }, []);

  return {
    state,
    selectDepartment,
    selectView,
    selectItem,
    goBack,
    reset,
  };
}

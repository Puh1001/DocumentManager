"use client";

import { useAbility } from "./use-ability";
import { Actions, Subjects } from "@/lib/types/ability.types";

/**
 * Hook to check if user can perform an action on a subject
 * @param action - The action to check (e.g., "view", "manage")
 * @param subject - The subject to check (e.g., "User", "Department")
 * @returns boolean indicating if user has permission
 */
export function useCanAccess(action: Actions, subject: Subjects): boolean {
  const { ability, loading } = useAbility();

  if (loading || !ability) {
    return false;
  }

  return ability.can(action, subject);
}

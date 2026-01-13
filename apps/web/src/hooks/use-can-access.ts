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

  // Check manage:all first (admin has full access)
  if (ability.can("manage", "all")) {
    return true;
  }

  // Check specific action on subject
  if (ability.can(action, subject)) {
    return true;
  }

  // Check manage:subject (if user can manage the subject, they can perform any action)
  if (typeof subject === "string" && subject !== "all") {
    if (ability.can("manage", subject)) {
      return true;
    }
  }

  return false;
}

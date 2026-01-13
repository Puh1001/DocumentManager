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
    if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
      console.log("[useCanAccess] Loading or no ability:", { loading, hasAbility: !!ability, action, subject });
    }
    return false;
  }

  // Check manage:all first (admin has full access)
  const canManageAll = ability.can("manage", "all");
  if (canManageAll) {
    if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
      console.log("[useCanAccess] Allowed via manage:all", { action, subject });
    }
    return true;
  }

  // Check action on "all" subject (if user has action:all, they can perform action on any subject)
  const canActionAll = ability.can(action, "all");
  if (canActionAll) {
    if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
      console.log("[useCanAccess] Allowed via action:all", { action, subject });
    }
    return true;
  }

  // Check specific action on subject
  const canActionSubject = ability.can(action, subject);
  if (canActionSubject) {
    if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
      console.log("[useCanAccess] Allowed via action:subject", { action, subject });
    }
    return true;
  }

  // Check manage:subject (if user can manage the subject, they can perform any action)
  if (typeof subject === "string" && subject !== "all") {
    const canManageSubject = ability.can("manage", subject);
    if (canManageSubject) {
      if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
        console.log("[useCanAccess] Allowed via manage:subject", { action, subject });
      }
      return true;
    }
  }

  if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
    console.log("[useCanAccess] DENIED", {
      action,
      subject,
      canManageAll,
      canActionAll,
      canActionSubject,
      rules: ability.rules,
    });
  }

  return false;
}

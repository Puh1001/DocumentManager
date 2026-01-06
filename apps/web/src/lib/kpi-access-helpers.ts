/**
 * Helper functions for KPI access control
 */

import type { User } from "@/lib/types/user.types";
import type { Department } from "@/lib/types/department.types";

const ADMIN_ROLE = "admin";
const BOSS_ROLE = "boss";

/**
 * Check if user has full KPI access (admin or boss)
 */
export function hasFullKpiAccess(user: User | null): boolean {
  if (!user) return false;
  return user.roles.includes(ADMIN_ROLE) || user.roles.includes(BOSS_ROLE);
}

/**
 * Get user's department string
 */
export function getUserDepartment(user: User | null): string | null {
  return user?.department || null;
}

/**
 * Get accessible departments for user
 * - Admin/Boss: All departments
 * - Other users: Only their department (if exists)
 */
export function getAccessibleDepartments(
  user: User | null,
  allDepartments: Department[]
): Department[] {
  if (!user) return [];

  // Admin/Boss: Show all departments
  if (hasFullKpiAccess(user)) {
    return allDepartments;
  }

  // Regular users: Only their department
  const userDepartment = getUserDepartment(user);
  if (!userDepartment) {
    return [];
  }

  // Match by code first, then by name
  const matched = allDepartments.find(
    (dept) =>
      dept.code?.toLowerCase() === userDepartment.toLowerCase() ||
      dept.name.toLowerCase() === userDepartment.toLowerCase()
  );

  return matched ? [matched] : [];
}

/**
 * Check if user can create KPI records
 */
export function canCreateKpi(user: User | null): boolean {
  if (!user) return false;
  // Admin/Boss can always create
  if (hasFullKpiAccess(user)) return true;
  // Regular users need a department
  return !!getUserDepartment(user);
}

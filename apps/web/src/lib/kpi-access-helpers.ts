/**
 * Helper functions for KPI access control
 */

import type { User } from "@/lib/types/user.types";
import type { Department } from "@/lib/types/department.types";

const ADMIN_ROLE = "admin";
const BOSS_ROLE = "boss";
const KPI_VIEWER_ALL_ROLE = "kpi_viewer_all";

/**
 * Check if user has full KPI access (admin or boss)
 */
export function hasFullKpiAccess(user: User | null): boolean {
  if (!user) return false;
  return user.roles.includes(ADMIN_ROLE) || user.roles.includes(BOSS_ROLE);
}

/**
 * Check if user can view all KPI records from all departments (read-only)
 */
export function canViewAllKpi(user: User | null): boolean {
  if (!user) return false;
  return user.roles.includes(KPI_VIEWER_ALL_ROLE);
}

/**
 * Check if user has read access to all KPI (admin, boss, or kpi_viewer_all)
 */
export function hasKpiReadAllAccess(user: User | null): boolean {
  if (!user) return false;
  return (
    user.roles.includes(ADMIN_ROLE) ||
    user.roles.includes(BOSS_ROLE) ||
    user.roles.includes(KPI_VIEWER_ALL_ROLE)
  );
}

/**
 * Get user's department string (LEGACY)
 * @deprecated Use getUserDepartments() instead
 */
export function getUserDepartment(user: User | null): string | null {
  return user?.department || null;
}

/**
 * Get user's department IDs from departments array
 * Returns array of department IDs
 */
export function getUserDepartments(user: User | null): string[] {
  if (!user) return [];

  // NEW: Get from departments array (multi-department support)
  if (user.departments && user.departments.length > 0) {
    return user.departments.map((dept) => dept.id);
  }

  // FALLBACK: Legacy single department field
  const userDepartment = getUserDepartment(user);
  if (!userDepartment) {
    return [];
  }

  // Try to match legacy department string to department ID
  // This is a fallback - ideally all users should have departments array
  return []; // Return empty, will be resolved by backend
}

/**
 * Get accessible departments for user
 * - Admin/Boss/KpiViewerAll: All departments
 * - Other users: All their assigned departments
 */
export function getAccessibleDepartments(
  user: User | null,
  allDepartments: Department[]
): Department[] {
  if (!user) return [];

  // Admin/Boss/KpiViewerAll: Show all departments
  if (hasFullKpiAccess(user) || canViewAllKpi(user)) {
    return allDepartments;
  }

  // NEW: Regular users - get all their assigned departments
  if (user.departments && user.departments.length > 0) {
    // Filter to only active departments
    return user.departments.filter((dept) => dept.isActive);
  }

  // FALLBACK: Legacy single department field
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
 * Check if user can access a specific department
 */
export function canAccessDepartment(
  user: User | null,
  departmentId: string
): boolean {
  if (!user) return false;

  // Admin/Boss/KpiViewerAll: Full access (read-only for kpi_viewer_all)
  if (hasFullKpiAccess(user) || canViewAllKpi(user)) return true;

  // Check if department is in user's departments
  const userDeptIds = getUserDepartments(user);
  return userDeptIds.includes(departmentId);
}

/**
 * Check if user can create KPI records
 */
export function canCreateKpi(user: User | null): boolean {
  if (!user) return false;
  // kpi_viewer_all is read-only, cannot create
  if (canViewAllKpi(user)) return false;
  // Admin/Boss can always create
  if (hasFullKpiAccess(user)) return true;
  // Regular users need at least one department
  const userDepts = getUserDepartments(user);
  return userDepts.length > 0;
}

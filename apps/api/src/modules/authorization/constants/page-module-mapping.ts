/**
 * Mapping of dashboard pages to their corresponding module subjects
 * Used for page-level permission checks
 */
export const PAGE_MODULE_MAPPING: Record<string, string> = {
  "/dashboard/users": "User",
  "/dashboard/departments": "Department",
  "/dashboard/kpi": "Kpi",
  "/dashboard/maintenance": "Maintenance",
  "/dashboard/permissions": "Permission",
} as const;

/**
 * Get module subject for a given page path
 */
export function getModuleForPage(pagePath: string): string | null {
  return PAGE_MODULE_MAPPING[pagePath] || null;
}


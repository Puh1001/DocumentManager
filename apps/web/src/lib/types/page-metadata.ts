/**
 * PageMetadata - Metadata for dashboard pages
 * Used for auto-discovery and permission checking
 */
export interface PageMetadata {
  /** Page route path (e.g., "/dashboard/users") */
  path: string;

  /** Display name for the page (e.g., "User Management") */
  name: string;

  /** Module name - must match Module.name in database (e.g., "User", "Department") */
  module: string;

  /** Permission action - defaults to "view" if not specified */
  action?: string;

  /** Lucide icon name (e.g., "Users", "Building2") */
  icon?: string;

  /** Navigation order - lower numbers appear first */
  order?: number;

  /** Whether page requires authentication - defaults to true */
  requiresAuth?: boolean;
}

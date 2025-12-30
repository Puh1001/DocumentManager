import type { PageMetadata } from "./types/page-metadata";

/**
 * Registry of all page metadata
 * Pages register themselves by importing and calling registerPage()
 */
const registeredPages: PageMetadata[] = [];

// Cache for sorted pages to avoid re-sorting on every call
let sortedCache: PageMetadata[] | null = null;

// Validation constants
const PATH_REGEX = /^\/dashboard\/[a-z0-9-/]+$/;
const MODULE_NAME_REGEX = /^[A-Z][a-zA-Z0-9]*$/;

/**
 * Normalize path by removing trailing slashes
 */
function normalizePath(path: string): string {
  return path.replace(/\/+$/, "");
}

/**
 * Register a page's metadata
 * Should be called at module level (not inside component)
 */
export function registerPage(metadata: PageMetadata): void {
  // Validate required fields first (before normalization)
  const missingFields: string[] = [];
  if (!metadata.path) missingFields.push("path");
  if (!metadata.name) missingFields.push("name");
  if (!metadata.module) missingFields.push("module");

  if (missingFields.length > 0) {
    throw new Error(
      `Invalid page metadata: missing required fields: ${missingFields.join(", ")}`
    );
  }

  // Normalize path (remove trailing slashes)
  const normalizedPath = normalizePath(metadata.path);
  const normalizedMetadata = { ...metadata, path: normalizedPath };

  // Validate path format
  if (!PATH_REGEX.test(normalizedMetadata.path)) {
    throw new Error(
      `Invalid path format: ${normalizedMetadata.path}. Path must match pattern: /dashboard/[a-z0-9-/]+`
    );
  }

  // Validate module name format (PascalCase)
  if (!MODULE_NAME_REGEX.test(normalizedMetadata.module)) {
    throw new Error(
      `Invalid module name: ${normalizedMetadata.module}. Module name must be PascalCase (start with uppercase, alphanumeric only)`
    );
  }

  // Check for duplicates
  const existing = registeredPages.find(
    (p) => p.path === normalizedMetadata.path
  );
  if (existing) {
    console.warn(
      `Page metadata already registered for path: ${normalizedMetadata.path}. Overwriting...`
    );
    const index = registeredPages.indexOf(existing);
    registeredPages[index] = normalizedMetadata;
    sortedCache = null; // Invalidate cache
    return;
  }

  registeredPages.push(normalizedMetadata);
  sortedCache = null; // Invalidate cache
}

/**
 * Get all registered pages, sorted by order
 * Uses cached sorted result for performance
 */
export function getAllPages(): PageMetadata[] {
  if (sortedCache === null) {
    sortedCache = [...registeredPages].sort(
      (a, b) => (a.order || 0) - (b.order || 0)
    );
  }
  return sortedCache;
}

/**
 * Get page metadata by path
 */
export function getPageByPath(path: string): PageMetadata | undefined {
  return registeredPages.find((p) => p.path === path);
}

/**
 * Get pages by module name
 */
export function getPagesByModule(module: string): PageMetadata[] {
  return registeredPages.filter((p) => p.module === module);
}

/**
 * Clear all registered pages (useful for testing)
 */
export function clearRegistry(): void {
  registeredPages.length = 0;
  sortedCache = null; // Clear cache
}

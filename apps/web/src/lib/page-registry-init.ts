/**
 * Page Registry Initialization
 *
 * This file forces all dashboard pages to be imported and registered
 * before the sidebar renders. This ensures the page registry is populated
 * even with Next.js App Router's lazy loading.
 *
 * @note This file should be imported in the sidebar or layout component
 *       to ensure pages are registered before use.
 */

// Import all dashboard pages to trigger registerPage() calls
// These imports ensure pages are registered in the page registry
// before the sidebar component tries to access them

import "@/app/[locale]/dashboard/users/page";
import "@/app/[locale]/dashboard/departments/page";
import "@/app/[locale]/dashboard/kpi/page";
import "@/app/[locale]/dashboard/maintenance/page";
import "@/app/[locale]/dashboard/permissions/page";
import "@/app/[locale]/dashboard/modules/page";
import "@/app/[locale]/dashboard/dcc/deletion-requests/page";

// Export nothing - this file is imported for side effects only

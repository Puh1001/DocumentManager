"use client";

import { ReactNode } from "react";
import { useAbility } from "@/hooks/use-ability";
import { AccessDenied } from "@/components/access-denied";
import type { PageMetadata } from "@/lib/types/page-metadata";
import { Actions, Subjects } from "@/lib/types/ability.types";
import { isValidSubject } from "@/lib/utils/subject-validation";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Card, CardContent } from "@/components/ui/card";

interface PageGuardProps {
  /** Page metadata containing module and action */
  metadata: PageMetadata;
  /** Page content to render if user has permission */
  children: ReactNode;
}

/**
 * PageGuard component - Automatically checks permissions from page metadata
 *
 * Auto-generates permission name from metadata (action:module format)
 * and checks if user has access. Shows AccessDenied if no permission.
 * Shows loading spinner while permissions are being loaded.
 *
 * @param metadata - Page metadata containing module and action
 * @param children - Page content to render if user has permission
 *
 * @example
 * ```tsx
 * <PageGuard metadata={pageMetadata}>
 *   <YourPageContent />
 * </PageGuard>
 * ```
 *
 * @remarks
 * - Module name must match Module.name in database
 * - Action defaults to "view" if not specified
 * - Shows loading spinner while abilities are being fetched
 * - Shows AccessDenied component if user lacks permission
 * - Renders children if user has permission
 * - Validates metadata.module before use
 * - Handles error state when ability loading fails
 */
export function PageGuard({ metadata, children }: PageGuardProps) {
  // Get ability, loading state, and error state (must be called unconditionally)
  const { ability, loading, error } = useAbility();

  // Validate metadata
  if (!metadata.module) {
    console.error("PageGuard: Missing module in metadata", metadata);
    return <AccessDenied />;
  }

  // Auto-generate permission from metadata
  const action = (metadata.action || "view") as Actions;
  const module = metadata.module;

  // Show error UI if ability loading failed
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <p className="text-destructive text-center">
              Failed to load permissions. Please refresh the page.
            </p>
            {process.env.NODE_ENV === "development" && (
              <p className="text-xs text-muted-foreground mt-2 text-center">
                {error.message}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show loading spinner while permissions are being loaded
  if (loading || !ability) {
    return <LoadingSpinner />;
  }

  // Validate module name is a valid Subject
  if (!isValidSubject(module)) {
    console.error(
      `PageGuard: Invalid module name: ${module}. Module must be a valid Subject.`
    );
    return <AccessDenied />;
  }

  // Check permission
  // Type assertion still needed because Subjects includes object types,
  // but runtime validation ensures module is a valid string literal
  // Check permission: allow if user can perform action on module,
  // or if user has manage:all (admin), or manage:module
  const canAccess =
    ability.can(action, module as Subjects) ||
    ability.can("manage", "all") ||
    ability.can("manage", module as Subjects);

  // Show AccessDenied if user doesn't have permission
  if (!canAccess) {
    return <AccessDenied />;
  }

  // Render children if user has permission
  return <>{children}</>;
}

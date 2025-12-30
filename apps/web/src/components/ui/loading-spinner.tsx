"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  /** Additional CSS classes */
  className?: string;
  /** Minimum height for the container */
  minHeight?: string;
  /** Size of the spinner icon */
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "h-4 w-4",
  md: "h-8 w-8",
  lg: "h-12 w-12",
};

/**
 * LoadingSpinner component - Consistent loading UI across the application
 *
 * @example
 * ```tsx
 * <LoadingSpinner />
 * <LoadingSpinner size="lg" minHeight="80vh" />
 * ```
 */
export function LoadingSpinner({
  className,
  minHeight = "60vh",
  size = "md",
}: LoadingSpinnerProps) {
  return (
    <div
      className={cn("flex items-center justify-center", className)}
      style={{ minHeight }}
    >
      <Loader2 className={cn("animate-spin text-primary", sizeClasses[size])} />
    </div>
  );
}

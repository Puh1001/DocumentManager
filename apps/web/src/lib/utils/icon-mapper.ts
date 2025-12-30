import {
  LayoutDashboard,
  FileText,
  Users,
  Settings,
  Shield,
  FolderOpen,
  BarChart2,
  TrendingUp,
  Wrench,
  Building2,
  type LucideIcon,
} from "lucide-react";

/**
 * Valid icon names that can be used in page metadata
 */
export type IconName =
  | "LayoutDashboard"
  | "FileText"
  | "Users"
  | "Settings"
  | "Shield"
  | "FolderOpen"
  | "BarChart2"
  | "TrendingUp"
  | "Wrench"
  | "Building2";

/**
 * Map icon name strings to Lucide React icon components
 * Used for dynamic icon rendering from page metadata
 */
const ICON_MAP: Record<IconName, LucideIcon> = {
  LayoutDashboard,
  FileText,
  Users,
  Settings,
  Shield,
  FolderOpen,
  BarChart2,
  TrendingUp,
  Wrench,
  Building2,
};

/**
 * Get icon component from icon name string
 * @param iconName - Icon name from page metadata (e.g., "Users", "FileText")
 * @param fallback - Fallback icon if iconName not found (defaults to FileText)
 * @returns Lucide React icon component
 *
 * @example
 * ```tsx
 * const Icon = getIcon("Users");
 * <Icon className="h-5 w-5" />
 * ```
 */
export function getIcon(
  iconName?: string,
  fallback: LucideIcon = FileText
): LucideIcon {
  if (!iconName) {
    return fallback;
  }

  // Type assertion needed because iconName comes from metadata (string)
  const Icon = ICON_MAP[iconName as IconName];
  return Icon || fallback;
}

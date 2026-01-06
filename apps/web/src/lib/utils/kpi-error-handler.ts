/**
 * KPI-specific error handler utility
 */

import { toast } from "@/hooks/use-toast";
import { toApiError } from "@/lib/types/api-error.types";

/**
 * Error messages mapping for KPI error codes
 */
const KPI_ERROR_MESSAGES: Record<string, string> = {
  "kpi.access.denied.different_department":
    "Bạn không có quyền truy cập bộ môn này",
  "kpi.access.denied.no_department": "Bạn cần thuộc một bộ môn",
  "kpi.department.mismatch": "Bạn không thể thao tác với bộ môn khác",
  "kpi.record.not_found": "Không tìm thấy KPI record",
  "kpi.metric.not_found": "Không tìm thấy KPI metric",
};

/**
 * Handle API errors for KPI operations
 * @param err - The error to handle
 * @param context - Context description for logging (e.g., "tải dữ liệu KPI")
 * @param options - Additional options
 */
export function handleKpiApiError(
  err: unknown,
  context: string,
  options?: {
    on403?: () => void;
    onOther?: () => void;
  }
): void {
  console.error(`Error in ${context}:`, err);

  const apiError = toApiError(err);

  if (apiError.statusCode === 403) {
    const errorMessage =
      apiError.errorCode && KPI_ERROR_MESSAGES[apiError.errorCode]
        ? KPI_ERROR_MESSAGES[apiError.errorCode]
        : "Bạn không có quyền thực hiện thao tác này";

    toast({
      title: "Không có quyền truy cập",
      description: errorMessage,
      variant: "destructive",
    });

    if (options?.on403) {
      options.on403();
    }
  } else {
    toast({
      title: "Lỗi",
      description: apiError.message || `Không thể ${context}`,
      variant: "destructive",
    });

    if (options?.onOther) {
      options.onOther();
    }
  }
}

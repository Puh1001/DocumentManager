/**
 * API Error type definitions
 */

/**
 * Extended Error type for API errors
 */
export interface ApiError extends Error {
  statusCode?: number;
  errorCode?: string;
  message: string;
}

/**
 * Type guard to check if error is an ApiError
 */
export function isApiError(err: unknown): err is ApiError {
  return (
    typeof err === "object" &&
    err !== null &&
    ("statusCode" in err || "errorCode" in err) &&
    "message" in err
  );
}

/**
 * Extract ApiError from unknown error
 */
export function toApiError(err: unknown): ApiError {
  if (isApiError(err)) {
    return err;
  }

  if (err instanceof Error) {
    return {
      ...err,
      statusCode: undefined,
      errorCode: undefined,
      message: err.message,
    };
  }

  return {
    name: "ApiError",
    message: "An unknown error occurred",
    statusCode: undefined,
    errorCode: undefined,
  };
}

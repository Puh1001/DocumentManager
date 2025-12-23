/**
 * Error code to translation key mapping
 * Maps backend error codes to frontend translation keys
 */
export function getErrorTranslationKey(errorCode: string | undefined): string {
  if (!errorCode) {
    return "errors.generic.somethingWentWrong";
  }

  // Direct mapping: error code -> translation key
  // Format: {module}.{action}.{error_type} -> errors.{module}.{action}.{error_type}
  return `errors.${errorCode}`;
}

/**
 * Extract error code from API error response
 */
export function extractErrorCode(error: unknown): string | undefined {
  if (
    error &&
    typeof error === "object" &&
    "errorCode" in error &&
    typeof (error as { errorCode: unknown }).errorCode === "string"
  ) {
    return (error as { errorCode: string }).errorCode;
  }
  if (
    error &&
    typeof error === "object" &&
    "response" in error &&
    error.response &&
    typeof error.response === "object" &&
    "errorCode" in error.response &&
    typeof (error.response as { errorCode: unknown }).errorCode === "string"
  ) {
    return (error.response as { errorCode: string }).errorCode;
  }
  return undefined;
}

interface ApiError {
  errorCode?: string;
  message?: string;
  response?: {
    errorCode?: string;
    message?: string;
  };
}

/**
 * Get translated error message
 * This should be used with useTranslations hook
 */
export function getErrorMessage(
  error: unknown,
  t: (key: string) => string
): string {
  const errorCode = extractErrorCode(error);
  if (errorCode) {
    const translationKey = getErrorTranslationKey(errorCode);
    const translated = t(translationKey);
    // If translation exists (not the same as key), return it
    if (translated !== translationKey) {
      return translated;
    }
  }

  // Fallback to error message or default
  if (error instanceof Error) {
    return error.message || t("errors.generic.somethingWentWrong");
  }

  if (error && typeof error === "object") {
    const apiError = error as ApiError;
    return (
      apiError.message ||
      apiError.response?.message ||
      t("errors.generic.somethingWentWrong")
    );
  }

  return t("errors.generic.somethingWentWrong");
}

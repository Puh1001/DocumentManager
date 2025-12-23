// Type definitions for i18n
import { routing } from "./routing";

export type Locale = (typeof routing.locales)[number];
export type DefaultLocale = typeof routing.defaultLocale;

// Translation namespace types
export type TranslationNamespaces =
  | "common"
  | "auth"
  | "dashboard"
  | "documents"
  | "errors";

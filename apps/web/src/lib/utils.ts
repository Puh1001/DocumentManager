import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export function formatDate(date: string | Date, locale?: string): string {
  return new Intl.DateTimeFormat(locale || "vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function formatDateShort(date: string | Date, locale?: string): string {
  return new Intl.DateTimeFormat(locale || "vi-VN", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

export function formatDateLong(date: string | Date, locale?: string): string {
  return new Intl.DateTimeFormat(locale || "vi-VN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(date));
}

export function formatDateTime(date: string | Date, locale?: string): string {
  return new Intl.DateTimeFormat(locale || "vi-VN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function getFileIcon(fileType: string): string {
  const icons: Record<string, string> = {
    pdf: "📄",
    doc: "📝",
    docx: "📝",
    xls: "📊",
    xlsx: "📊",
    ppt: "📽️",
    pptx: "📽️",
    png: "🖼️",
    jpg: "🖼️",
    jpeg: "🖼️",
  };

  return icons[fileType.toLowerCase()] || "📁";
}

/**
 * Extract a short name from a long title
 * For titles with Chinese + Vietnamese, extracts the first meaningful part
 * Truncates long titles to a maximum length
 */
export function getShortName(title: string, maxLength: number = 30): string {
  if (!title) return "";

  // Remove extra whitespace
  let short = title.trim();

  // If title contains parentheses, try to get content before first parenthesis
  const parenIndex = short.indexOf("(");
  if (parenIndex > 0 && parenIndex < 50) {
    short = short.substring(0, parenIndex).trim();
  }

  // If title is still too long, truncate
  if (short.length > maxLength) {
    short = short.substring(0, maxLength).trim() + "...";
  }

  return short;
}

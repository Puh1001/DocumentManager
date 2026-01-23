import * as path from "path";

/**
 * Validates and sanitizes file extension
 * @param fileName Original filename
 * @returns Safe extension (defaults to .bin if invalid)
 */
export function getSafeExtension(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase();
  
  // Ensure extension is safe (alphanumeric + common file extensions only)
  // Whitelist common safe extensions
  const allowedExts = /^\.(pdf|doc|docx|xls|xlsx|ppt|pptx|png|jpg|jpeg|gif|txt|csv|zip|rar|7z)$/;
  
  // If extension matches allowed pattern, return it
  // Otherwise default to .bin for safety
  return allowedExts.test(ext) ? ext : ".bin";
}

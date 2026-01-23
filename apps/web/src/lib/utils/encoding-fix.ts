/**
 * Client-side encoding utility
 * 
 * NOTE: Backend now sends correct UTF-8 filenames via fileName field.
 * This function is kept for backward compatibility but simply returns the filename as-is.
 * 
 * @param fileName - The file name from API (already correct UTF-8)
 * @returns The file name unchanged
 */
export function fixFileNameEncoding(fileName: string): string {
  // Backend sends correct UTF-8, no fix needed
  return fileName || '';
}

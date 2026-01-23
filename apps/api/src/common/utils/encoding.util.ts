/**
 * Encoding utility to fix file name encoding issues
 * 
 * Problem: When files are uploaded via multipart/form-data, Multer decodes
 * UTF-8 file names as Latin1 (ISO-8859-1), resulting in mojibake (corrupted encoding).
 * 
 * Root Cause:
 * - Browser sends filename as UTF-8 bytes in FormData
 * - Multer receives and decodes as Latin1 instead of UTF-8
 * - Result: UTF-8 bytes interpreted as Latin1 → mojibake
 * 
 * Solution:
 * - Convert Latin1-decoded string back to UTF-8 by reinterpreting bytes
 * - Simple: Buffer.from(str, 'latin1').toString('utf8')
 * 
 * Example:
 * - Original: "Thông báo khám sức khỏe Định kỳ.pdf"
 * - Corrupted (Latin1-decoded): "ThÃ´ng bÃ¡o khÃ¡m sá»©c khá»e Äá»nh ká»³.pdf"
 * - Fixed: "Thông báo khám sức khỏe Định kỳ.pdf"
 * 
 * This simple approach covers ALL Vietnamese, Chinese, and other Unicode characters
 * without needing hardcoded patterns.
 */

/**
 * Simple and direct encoding fix for Multer filename corruption
 * 
 * This is a simplified approach that directly converts Latin1→UTF8 and normalizes.
 * Use this for testing new uploads to verify the fix works correctly.
 * 
 * Algorithm:
 * 1. Remove control characters first (they corrupt regardless of encoding)
 * 2. Check if string contains Latin1 mojibake patterns (0x80-0xFF chars that look like mojibake)
 * 3. If yes, convert Latin1→UTF8; if no, use as-is
 * 4. Normalize to NFC
 * 
 * @param fileName - The file name from Multer (may be corrupted as Latin1)
 * @returns Fixed file name with correct UTF-8 encoding, normalized to NFC
 */
export function fixFileNameEncodingSimple(fileName: string): string {
  if (!fileName) {
    return fileName;
  }
  
  // Step 0: Remove control characters first (0x00-0x1F, except tab/newline/carriage return)
  // These corrupt filenames regardless of encoding
  let cleaned = fileName.split('').filter(char => {
    const code = char.charCodeAt(0);
    return code >= 0x20 || [0x09, 0x0A, 0x0D].includes(code);
  }).join('');
  
  // Step 1: Check if contains Latin1 supplement chars (0x80-0xFF)
  // These indicate filename was decoded as Latin1 instead of UTF-8
  const hasLatin1Chars = /[\u0080-\u00FF]/.test(cleaned);
  
  // Step 2: If has Latin1 chars, try converting (might be mojibake)
  // If no Latin1 chars, it's likely already correct UTF-8 or plain ASCII
  if (hasLatin1Chars) {
    try {
      // Convert: Latin1 bytes → UTF-8 string
      // This reverses the mis-decoding that happened in Multer
      // Example: "ThÃ´ng" (Latin1) → "Thông" (UTF-8)
      const buffer = Buffer.from(cleaned, 'latin1');
      const utf8Name = buffer.toString('utf8');
      
      // Validate: conversion should produce valid UTF-8 and be different
      // If conversion produces replacement characters or same result, original might be correct
      if (utf8Name !== cleaned && !utf8Name.includes('\uFFFD')) {
        cleaned = utf8Name;
      }
    } catch (error) {
      // If conversion fails, use original cleaned string
    }
  }
  
  // Step 3: Normalize to NFC (Canonical Composition) for database compatibility
  // NFC is preferred for PostgreSQL and Windows file systems
  return cleaned.normalize('NFC');
}

/**
 * Validates if a string is valid UTF-8 and doesn't contain problematic characters
 */
function isValidUtf8String(str: string): boolean {
  if (!str) return true;
  
  // Check for null bytes (invalid in UTF-8 strings)
  if (str.includes('\0')) {
    return false;
  }
  
  // Check if string can be safely encoded/decoded as UTF-8
  try {
    const encoded = Buffer.from(str, 'utf8');
    const decoded = encoded.toString('utf8');
    // If round-trip conversion works and no null bytes, it's valid
    return decoded === str && !decoded.includes('\0');
  } catch (error) {
    return false;
  }
}

/**
 * Fixes file name encoding from multipart uploads
 * 
 * Problem: Multer decodes filename as Latin1 (ISO-8859-1) instead of UTF-8
 * Solution: Convert Latin1 bytes back to UTF-8
 * 
 * Also handles complex corruption patterns:
 * - Hex escape sequences: \x07, \x10, \x11, etc.
 * - Unicode escape sequences: \u0011, etc.
 * - Replacement characters: , 
 * - Multiple layers of corruption
 * 
 * Algorithm:
 * 1. Handle hex escape sequences (\x07, \x10, etc.)
 * 2. Handle Unicode escape sequences (\u0011, etc.)
 * 3. Check if contains Latin1 supplement chars (0x80-0xFF)
 * 4. If yes, convert: Latin1 bytes → UTF-8 string
 * 5. Validate result (no null bytes, valid UTF-8)
 * 6. Return fixed filename or original if conversion fails
 * 
 * @param fileName - The file name (may be corrupted with multiple encoding issues)
 * @returns Fixed file name with correct UTF-8 encoding
 */
export function fixFileNameEncoding(fileName: string): string {
  if (!fileName) {
    return fileName;
  }
  
  let processed = fileName;
  
  // Step 0: Remove actual binary control characters from the string
  // These are control characters (0x00-0x1F) that may be stored as actual bytes in the database
  // We remove them as they corrupt the filename and can't be part of valid UTF-8 sequences
  processed = processed.split('').filter(char => {
    const code = char.charCodeAt(0);
    // Keep printable characters (0x20+) and common whitespace (tab, newline, carriage return)
    return code >= 0x20 || [0x09, 0x0A, 0x0D].includes(code);
  }).join('');
  
  // Step 1: Handle hex escape sequences (like \x07, \x10, \x11)
  // These are often present in corrupted database data as literal escape sequences
  if (/\\x[0-9A-Fa-f]{2}/.test(processed)) {
    try {
      processed = processed.replace(/\\(x[0-9A-Fa-f]{2})/gi, (match, hex) => {
        const byteValue = parseInt(hex, 16);
        // Only replace if it's a valid printable character or part of UTF-8 sequence
        // Control characters (0x00-0x1F, except 0x09, 0x0A, 0x0D) are likely corruption
        if (byteValue < 0x20 && ![0x09, 0x0A, 0x0D].includes(byteValue)) {
          // Try to skip control characters that are likely corruption
          return '';
        }
        return String.fromCharCode(byteValue);
      });
    } catch (error) {
      // If hex replacement fails, continue with original
    }
  }
  
  // Step 2: Handle Unicode escape sequences (like \u0011)
  if (/\\u[0-9A-Fa-f]{4}/.test(processed)) {
    try {
      processed = processed.replace(/\\u([0-9A-Fa-f]{4})/gi, (match, hex) => {
        const codePoint = parseInt(hex, 16);
        // Control characters are likely corruption
        if (codePoint < 0x20 && ![0x09, 0x0A, 0x0D].includes(codePoint)) {
          return '';
        }
        return String.fromCharCode(codePoint);
      });
    } catch (error) {
      // If Unicode replacement fails, continue
    }
  }
  
  // Step 3: Handle replacement characters (U+FFFD) - try to remove them
  // They indicate data loss and can't be recovered, but we can try Latin1→UTF8 on surrounding context
  const hasReplacementChars = processed.includes('\uFFFD');
  
  // Step 4: Check if contains Latin1 supplement chars (0x80-0xFF)
  // These indicate filename was decoded as Latin1 instead of UTF-8
  const hasLatin1Chars = /[\u0080-\u00FF]/.test(processed);
  
  if (!hasLatin1Chars && !hasReplacementChars) {
    // No Latin1 chars and no replacement chars = likely already correct UTF-8 (or plain ASCII)
    // But might still have corruption, so try Latin1→UTF8 anyway if different from original
    if (processed !== fileName) {
      // Already processed hex/Unicode escapes, return processed version
      return processed;
    }
    return fileName;
  }
  
  try {
    // Convert: Latin1 bytes → UTF-8 string
    // This reverses the mis-decoding that happened in Multer
    // Example: "ThÃ´ng" (Latin1) → "Thông" (UTF-8)
    const buffer = Buffer.from(processed, 'latin1');
    const fixed = buffer.toString('utf8');
    
    // Validate fix:
    // 1. Must be different from original (conversion happened)
    // 2. No null bytes (invalid in filenames)
    // 3. Valid UTF-8 (can round-trip encode/decode)
    // 4. Fewer replacement characters than original (if any)
    const originalReplacementCount = (fileName.match(/\uFFFD/g) || []).length;
    const fixedReplacementCount = (fixed.match(/\uFFFD/g) || []).length;
    
    if (fixed !== processed && 
        !fixed.includes('\0') &&
        isValidUtf8String(fixed) &&
        fixedReplacementCount <= originalReplacementCount) {
      return fixed;
    }
  } catch (error) {
    // If conversion fails, return processed version (with hex/Unicode escapes fixed)
  }
  
  // Return processed version if we fixed hex/Unicode escapes, otherwise original
  const result = processed !== fileName ? processed : fileName;
  
  // Final step: Normalize to NFC (Canonical Composition) for database compatibility
  // NFC is preferred for PostgreSQL and Windows file systems
  // This ensures consistent Unicode representation across the system
  return result.normalize('NFC');
}

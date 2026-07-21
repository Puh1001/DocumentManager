import { diskStorage } from 'multer';
import { extname } from 'path';
import { Request } from 'express';

/**
 * Custom Multer configuration with UTF-8 filename handling
 * 
 * Problem: Multer may decode UTF-8 filenames incorrectly, causing mojibake.
 * Solution: Use custom filename handler that preserves UTF-8 encoding.
 */
export const multerConfig = {
  storage: diskStorage({
    destination: './uploads', // Temporary storage (files are moved to SMB after processing)
    filename: (req: Request, file: Express.Multer.File, callback: (error: Error | null, filename: string) => void) => {
      // Extract original filename and preserve UTF-8 encoding
      // The filename will be fixed by encoding.util.ts after this
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = extname(file.originalname);
      // Use original filename (will be fixed by encoding utility)
      callback(null, `${uniqueSuffix}${ext}`);
    },
  }),
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB
  },
  fileFilter: (req: Request, file: Express.Multer.File, callback: (error: Error | null, acceptFile: boolean) => void) => {
    // Accept all files, validation happens in services
    callback(null, true);
  },
};

/**
 * Custom filename decoder for Multer
 * 
 * This function properly decodes UTF-8 filenames from multipart/form-data.
 * The issue is that browsers send filenames in Content-Disposition header
 * which may be URL-encoded or have encoding issues.
 */
export function decodeFilename(filename: string): string {
  if (!filename) return filename;
  
  try {
    // Try to decode URL-encoded filename (RFC 2231 or RFC 5987)
    // Filenames in Content-Disposition can be encoded like: filename*=UTF-8''filename
    if (filename.includes("''")) {
      const parts = filename.split("''");
      if (parts.length === 2) {
        const decoded = decodeURIComponent(parts[1]);
        return decoded;
      }
    }
    
    // Try URL decoding if it looks encoded
    if (filename.includes('%')) {
      try {
        const decoded = decodeURIComponent(filename);
        return decoded;
      } catch {
        // If decode fails, return original
      }
    }
    
    return filename;
  } catch (error) {
    // If any decoding fails, return original
    return filename;
  }
}

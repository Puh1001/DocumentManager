import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Request } from 'express';
import { fixFileNameEncoding, fixFileNameEncodingSimple } from '../utils/encoding.util';

/**
 * Interceptor that fixes filename encoding after Multer processes the file
 * 
 * This interceptor runs AFTER FileInterceptor processes the multipart form data.
 * It fixes UTF-8 encoding issues in filenames that may have been corrupted
 * during the multipart parsing process.
 * 
 * Usage:
 * @UseInterceptors(FileInterceptor('file'), Utf8FileFixInterceptor)
 */
@Injectable()
export class Utf8FileFixInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    
    // Fix filename encoding if file exists
    // Use simple fix for new uploads (direct Latin1→UTF8 conversion)
    // This is the recommended approach: Buffer.from(str, 'latin1').toString('utf8')
    if (request.file && request.file.originalname) {
      const originalName = request.file.originalname;
      // Use simple fix for new uploads - direct conversion without complex heuristics
      const fixedName = fixFileNameEncodingSimple(originalName);
      
      // Log if fix was applied (for debugging)
      if (originalName !== fixedName) {
        console.log(`[UTF8 Fix] Fixed filename: "${originalName}" -> "${fixedName}"`);
      }
      
      request.file.originalname = fixedName;
    }
    
    // Also handle multiple files (if using FileFieldsInterceptor or FilesInterceptor)
    if (request.files) {
      if (Array.isArray(request.files)) {
        request.files.forEach((file: Express.Multer.File) => {
          if (file && file.originalname) {
            const originalName = file.originalname;
            const fixedName = fixFileNameEncodingSimple(originalName);
            if (originalName !== fixedName) {
              console.log(`[UTF8 Fix] Fixed filename: "${originalName}" -> "${fixedName}"`);
            }
            file.originalname = fixedName;
          }
        });
      } else if (typeof request.files === 'object') {
        // Handle FileFieldsInterceptor case (object with field names as keys)
        Object.values(request.files).forEach((fileArray: Express.Multer.File[]) => {
          if (Array.isArray(fileArray)) {
            fileArray.forEach((file: Express.Multer.File) => {
              if (file && file.originalname) {
                const originalName = file.originalname;
                const fixedName = fixFileNameEncodingSimple(originalName);
                if (originalName !== fixedName) {
                  console.log(`[UTF8 Fix] Fixed filename: "${originalName}" -> "${fixedName}"`);
                }
                file.originalname = fixedName;
              }
            });
          }
        });
      }
    }
    
    return next.handle();
  }
}

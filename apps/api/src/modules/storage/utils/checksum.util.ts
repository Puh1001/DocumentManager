import { Logger } from "@nestjs/common";
import { SmbService } from "../services/smb.service";
import * as crypto from "crypto";

/**
 * Utility for calculating file checksums using streams
 * Avoids loading entire files into memory
 */
export class ChecksumUtil {
  private static readonly logger = new Logger(ChecksumUtil.name);
  private static readonly TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

  /**
   * Calculate file checksum using stream (không load toàn bộ file vào memory)
   */
  static async calculateChecksum(
    smbService: SmbService,
    filePath: string
  ): Promise<string> {
    try {
      const hash = crypto.createHash("sha256");
      const stream = await smbService.readFileStream(filePath);

      return new Promise((resolve, reject) => {
        let hasError = false;

        // Timeout protection (5 minutes for very large files)
        const timeout = setTimeout(() => {
          if (!hasError) {
            hasError = true;
            stream.destroy();
            reject(new Error(`Checksum calculation timeout for ${filePath}`));
          }
        }, ChecksumUtil.TIMEOUT_MS);

        stream.on("data", (chunk: Buffer) => {
          if (!hasError) {
            hash.update(chunk);
          }
        });

        stream.on("end", () => {
          clearTimeout(timeout);
          if (!hasError) {
            resolve(hash.digest("hex"));
          }
        });

        stream.on("error", (error: Error) => {
          clearTimeout(timeout);
          if (!hasError) {
            hasError = true;
            this.logger.error(
              `Failed to read file stream for checksum ${filePath}: ${error.message}`
            );
            reject(error);
          }
        });
      });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.logger.error(
        `Failed to calculate checksum for ${filePath}: ${errorMessage}`
      );
      throw error;
    }
  }
}

import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export interface OpenPathResponse {
  networkPath: string;
  fileUrl: string;
  explorerCommand: string;
}

@Injectable()
export class LocalEditService {
  private readonly networkBasePath: string;

  constructor(private readonly configService: ConfigService) {
    const smbServer = this.configService.get<string>(
      "SMB_SERVER",
      "10.0.60.30"
    );
    const smbShare = this.configService.get<string>("SMB_SHARE", "Public");
    const smbBasePath = this.configService.get<string>(
      "SMB_BASE_PATH",
      "IT-Information Technology Dept\\devTest"
    );

    // Full network path: \\10.0.60.30\Public\IT-Information Technology Dept\devTest
    this.networkBasePath = `\\\\${smbServer}\\${smbShare}\\${smbBasePath}`;
  }

  /**
   * Generate paths for opening file in local application
   */
  getOpenFilePath(relativePath: string): OpenPathResponse {
    const networkPath = this.toNetworkPath(relativePath);
    const fileUrl = this.toFileUrl(networkPath);
    const explorerCommand = `explorer.exe "${networkPath}"`;

    return {
      networkPath,
      fileUrl,
      explorerCommand,
    };
  }

  /**
   * Generate paths for opening folder in Windows Explorer
   */
  getOpenFolderPath(relativePath: string): OpenPathResponse {
    const networkPath = this.toNetworkPath(relativePath);
    const fileUrl = this.toFileUrl(networkPath);
    const explorerCommand = `explorer.exe "${networkPath}"`;

    return {
      networkPath,
      fileUrl,
      explorerCommand,
    };
  }

  /**
   * Convert relative path to Windows network path format
   */
  private toNetworkPath(relativePath: string): string {
    const normalized = relativePath.replace(/\//g, "\\");
    return `${this.networkBasePath}\\${normalized}`;
  }

  /**
   * Convert network path to file:// URL format
   * Note: Browsers may block file:// URLs for security reasons
   */
  private toFileUrl(networkPath: string): string {
    return `file:///${networkPath.replace(/\\/g, "/")}`;
  }
}

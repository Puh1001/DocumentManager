# Brainstorm: Modern SMB Connection Solutions

**Date:** 2024-12-18  
**Context:** Thay thế `smb2` library cũ và legacy OpenSSL dependencies

---

## Problem Statement

### Current Issues

1. **`smb2` library outdated**: Không maintain, không tương thích Node.js 22+
2. **Legacy OpenSSL required**: Cần `--openssl-legacy-provider` flag (deprecated)
3. **`cross-env` dependency**: Thêm một layer không cần thiết
4. **NTLM authentication issues**: MD4/DES algorithms không được support

### Requirements

- ✅ Windows domain authentication (`bestpacific.com`)
- ✅ Server: `10.0.60.30`, Share: `Public`
- ✅ Base path: `IT-Information Technology Dept\devTest`
- ✅ CRUD operations (list, read, write, delete, create dir)
- ✅ File streaming for web viewer
- ✅ Support Node.js 22+ without legacy flags
- ✅ TypeScript support
- ✅ Production-ready, maintainable

### Constraints

- **Development:** Windows (code trên Windows)
- **Production:** Ubuntu server (deploy trên Linux)
- **Future:** 2 servers Ubuntu mount chung 1 storage (high availability/redundancy)
- SMB share nằm trên Windows network (`10.0.60.30`)
- Cần domain authentication (`bestpacific.com`)
- Docker deployment với volume mount support

---

## Solution Options

### Option 1: Direct File System Access (Windows UNC Paths) ⭐ **RECOMMENDED**

**Approach:** Sử dụng Node.js `fs` module trực tiếp với UNC paths trên Windows

**Implementation:**

```typescript
// Windows: Direct UNC path access
const path = "\\\\10.0.60.30\\Public\\IT-Information Technology Dept\\devTest";
await fs.promises.readdir(path);
```

**Pros:**

- ✅ **No external dependencies** - chỉ dùng Node.js built-in `fs`
- ✅ **Native Windows support** - UNC paths work natively
- ✅ **No OpenSSL issues** - không cần legacy provider
- ✅ **Best performance** - direct OS-level access
- ✅ **Simple & maintainable** - standard Node.js APIs
- ✅ **TypeScript support** - full type definitions

**Cons:**

- ❌ **Windows-only** - không work trên Linux (trừ khi mount)
- ❌ **Requires network access** - backend phải có quyền truy cập SMB
- ❌ **Domain auth via OS** - phải authenticate trước (net use hoặc Windows credentials)

**When to use:**

- Backend deploy trên Windows server
- Hoặc Linux với SMB share đã được mount

**Code Example:**

```typescript
import * as fs from "fs";
import * as path from "path";

@Injectable()
export class SmbService {
  private basePath: string;

  constructor(private config: ConfigService) {
    // UNC path: \\10.0.60.30\Public\IT-Information Technology Dept\devTest
    this.basePath = `\\\\${config.get("SMB_SERVER")}\\${config.get("SMB_SHARE")}\\${config.get("SMB_BASE_PATH")}`;
  }

  async listDirectory(relativePath: string): Promise<FileInfo[]> {
    const fullPath = path.join(this.basePath, relativePath);
    const entries = await fs.promises.readdir(fullPath, {
      withFileTypes: true,
    });
    // ... process entries
  }
}
```

---

### Option 2: Mount Drive Approach

**Approach:** Mount SMB share như local drive, dùng `fs` module

**Windows:**

```bash
net use Z: \\10.0.60.30\Public /user:bestpacific.com\username password
```

**Linux:**

```bash
sudo mount -t cifs //10.0.60.30/Public /mnt/smb -o username=user,password=pass,domain=bestpacific.com
```

**Pros:**

- ✅ **Simple code** - chỉ dùng `fs` module
- ✅ **Cross-platform** - work trên cả Windows và Linux
- ✅ **No dependencies** - không cần SMB library
- ✅ **OS-level caching** - tốt cho performance

**Cons:**

- ❌ **Requires mount setup** - phải mount trước khi start app
- ❌ **Credentials management** - phải store password để mount
- ❌ **Mount persistence** - phải handle re-mount nếu disconnect
- ❌ **Docker complexity** - cần mount trong container hoặc host

**When to use:**

- Production deployment với infrastructure control
- Cần performance cao nhất
- Có thể setup mount automation

---

### Option 3: Child Process với `smbclient`

**Approach:** Dùng `smbclient` CLI tool qua child process

**Implementation:**

```typescript
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async listDirectory(path: string) {
  const cmd = `smbclient //10.0.60.30/Public -U bestpacific.com\\user%pass -c "ls ${path}"`;
  const { stdout } = await execAsync(cmd);
  // Parse output
}
```

**Pros:**

- ✅ **No Node.js dependencies** - dùng system tool
- ✅ **Well-tested** - `smbclient` là standard tool
- ✅ **Cross-platform** - có trên Linux, có thể install trên Windows

**Cons:**

- ❌ **Parse output** - phải parse text output (không structured)
- ❌ **Performance overhead** - spawn process mỗi lần
- ❌ **Error handling** - khó handle errors từ CLI
- ❌ **Windows support** - cần install Samba tools

**When to use:**

- Linux-only deployment
- Không muốn dependencies
- Chấp nhận performance trade-off

---

### Option 4: Modern SMB Library Alternatives

#### 4a. `marsaud-smb2` (Fork của smb2)

**Status:** Fork với một số updates, nhưng vẫn có thể có OpenSSL issues

**Pros:**

- ✅ Similar API to current code
- ✅ Some updates from original

**Cons:**

- ❌ **Still may have OpenSSL issues** - fork của library cũ
- ❌ **Uncertain maintenance** - không rõ update frequency
- ❌ **Same NTLM problem** - vẫn dùng MD4/DES

#### 4b. `@marsaud/smb2-client` (nếu có)

**Status:** Cần research thêm

#### 4c. Native SMB3 với WebDAV

**Approach:** SMB3 có thể expose qua WebDAV, dùng HTTP client

**Pros:**

- ✅ **Standard HTTP** - dùng `fetch` hoặc `axios`
- ✅ **No SMB protocol** - đơn giản hơn

**Cons:**

- ❌ **Requires WebDAV setup** - phải config server
- ❌ **Limited operations** - không đầy đủ như SMB native
- ❌ **Performance** - HTTP overhead

---

### Option 5: Hybrid Approach

**Approach:** Kết hợp nhiều methods với fallback

```typescript
class SmbService {
  private strategy: "direct" | "mounted" | "smbclient";

  async detectStrategy() {
    // Try direct UNC (Windows)
    if (process.platform === "win32") {
      try {
        await this.testDirectAccess();
        this.strategy = "direct";
        return;
      } catch {}
    }

    // Try mounted drive
    try {
      await this.testMountedPath();
      this.strategy = "mounted";
      return;
    } catch {}

    // Fallback to smbclient
    this.strategy = "smbclient";
  }
}
```

**Pros:**

- ✅ **Flexible** - adapt to environment
- ✅ **Resilient** - có fallback options

**Cons:**

- ❌ **Complex** - nhiều code paths
- ❌ **Harder to maintain** - nhiều strategies
- ❌ **Testing complexity** - phải test nhiều paths

---

## Recommendation Matrix

| Solution                   | Windows Native | Linux Support     | Dependencies | Performance | Maintenance | Score    |
| -------------------------- | -------------- | ----------------- | ------------ | ----------- | ----------- | -------- |
| **Direct UNC (Option 1)**  | ✅ Excellent   | ⚠️ Requires mount | ✅ None      | ⭐⭐⭐⭐⭐  | ⭐⭐⭐⭐⭐  | **9/10** |
| **Mount Drive (Option 2)** | ✅ Good        | ✅ Good           | ✅ None      | ⭐⭐⭐⭐⭐  | ⭐⭐⭐⭐    | **8/10** |
| **smbclient (Option 3)**   | ⚠️ Needs tools | ✅ Native         | ✅ None      | ⭐⭐⭐      | ⭐⭐⭐      | **6/10** |
| **marsaud-smb2**           | ✅ Works       | ✅ Works          | ⚠️ Library   | ⭐⭐⭐⭐    | ⭐⭐        | **5/10** |
| **Hybrid**                 | ✅ Flexible    | ✅ Flexible       | ⚠️ Complex   | ⭐⭐⭐⭐    | ⭐⭐        | **6/10** |

---

## Final Recommendation

### **Hybrid Approach: Platform-Aware File System Access** ⭐ **RECOMMENDED**

**Rationale:**

1. **Development (Windows):** Dùng UNC paths hoặc mount drive - đơn giản, không cần dependencies
2. **Production (Linux):** Mount SMB share như local path - standard approach, tốt cho Docker
3. **High Availability:** 2 servers mount chung storage - đảm bảo redundancy
4. **No legacy issues** - không cần OpenSSL flags, không cần `smb2` library
5. **Production-ready** - standard Node.js `fs` APIs, cross-platform
6. **Docker-friendly** - mount trên host, pass vào container như volume

### Implementation Plan

#### Phase 1: Platform Detection & Path Strategy

**Development (Windows):**

- Option A: Direct UNC paths (`\\10.0.60.30\Public\...`)
- Option B: Mount drive (`Z:\...`) - tốt hơn nếu có network issues

**Production (Linux):**

- Mount SMB share trên host: `/mnt/smb`
- Pass vào Docker container như volume: `/shared`
- Code chỉ cần dùng `/shared` path

#### Phase 2: SmbService Refactor

- Remove `smb2` dependency hoàn toàn
- Use `fs.promises` với platform-aware paths
- Auto-detect platform và chọn strategy

#### Phase 3: Mount Automation

**Development (Windows):**

```bash
# Optional: Map drive for easier access
net use Z: \\10.0.60.30\Public /user:bestpacific.com\user password /persistent:yes
```

**Production (Linux):**

```bash
# Auto-mount script (systemd service hoặc init script)
sudo mount -t cifs //10.0.60.30/Public /mnt/smb \
  -o username=user,password=pass,domain=bestpacific.com,uid=1000,gid=1000,file_mode=0664,dir_mode=0775
```

**High Availability Setup:**

- 2 Ubuntu servers mount cùng SMB share
- Load balancer (Nginx/HAProxy) phía trước
- Shared storage đảm bảo data consistency

### Code Structure

```typescript
import { Injectable, OnModuleInit, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as fs from "fs";
import * as path from "path";
import { Readable } from "stream";

interface FileInfo {
  name: string;
  path: string;
  isDirectory: boolean;
  size?: number;
  modifiedAt?: Date;
}

@Injectable()
export class SmbService implements OnModuleInit {
  private readonly logger = new Logger(SmbService.name);
  private basePath: string;
  private readonly platform: "windows" | "linux";

  constructor(private readonly configService: ConfigService) {
    this.platform = process.platform === "win32" ? "windows" : "linux";

    if (this.platform === "windows") {
      // Development: Windows UNC path or mounted drive
      const useMountedDrive = this.configService.get<boolean>(
        "SMB_USE_MOUNTED_DRIVE",
        false
      );

      if (useMountedDrive) {
        // Use mounted drive (e.g., Z:\)
        const drive = this.configService.get<string>("SMB_MOUNTED_DRIVE", "Z:");
        const basePath = this.configService.get<string>("SMB_BASE_PATH", "");
        this.basePath = path.join(drive, basePath);
      } else {
        // Direct UNC path
        const server = this.configService.get<string>(
          "SMB_SERVER",
          "10.0.60.30"
        );
        const share = this.configService.get<string>("SMB_SHARE", "Public");
        const basePath = this.configService.get<string>("SMB_BASE_PATH", "");
        this.basePath = `\\\\${server}\\${share}\\${basePath}`;
      }
    } else {
      // Production: Linux mounted path (from Docker volume)
      this.basePath = this.configService.get<string>(
        "SMB_MOUNT_PATH",
        "/shared"
      );
    }

    this.logger.log(`SMB Base Path: ${this.basePath} (${this.platform})`);
  }

  async onModuleInit() {
    // Test connection
    try {
      await fs.promises.access(this.basePath, fs.constants.R_OK);
      this.logger.log("SMB path accessible");
    } catch (error) {
      this.logger.warn(`SMB path not accessible: ${error.message}`);
      if (this.platform === "linux") {
        this.logger.warn("Make sure SMB share is mounted on host: /mnt/smb");
      }
    }
  }

  private getFullPath(relativePath: string): string {
    return path.join(this.basePath, relativePath);
  }

  async listDirectory(relativePath: string = ""): Promise<FileInfo[]> {
    const fullPath = this.getFullPath(relativePath);
    const entries = await fs.promises.readdir(fullPath, {
      withFileTypes: true,
    });

    const fileInfos: FileInfo[] = [];

    for (const entry of entries) {
      const entryPath = path.join(relativePath, entry.name);
      const entryFullPath = path.join(fullPath, entry.name);
      const stats = await fs.promises.stat(entryFullPath);

      fileInfos.push({
        name: entry.name,
        path: entryPath.replace(/\\/g, "/"), // Normalize to forward slashes
        isDirectory: entry.isDirectory(),
        size: entry.isFile() ? stats.size : undefined,
        modifiedAt: stats.mtime,
      });
    }

    // Sort: directories first, then by name
    return fileInfos.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name);
    });
  }

  async readFile(relativePath: string): Promise<Buffer> {
    const fullPath = this.getFullPath(relativePath);
    return fs.promises.readFile(fullPath);
  }

  async readFileStream(relativePath: string): Promise<Readable> {
    const fullPath = this.getFullPath(relativePath);
    return fs.createReadStream(fullPath);
  }

  async writeFile(relativePath: string, data: Buffer): Promise<void> {
    const fullPath = this.getFullPath(relativePath);
    const dir = path.dirname(fullPath);

    // Ensure directory exists
    await fs.promises.mkdir(dir, { recursive: true });
    await fs.promises.writeFile(fullPath, data);
  }

  async createDirectory(relativePath: string): Promise<void> {
    const fullPath = this.getFullPath(relativePath);
    await fs.promises.mkdir(fullPath, { recursive: true });
  }

  async deleteFile(relativePath: string): Promise<void> {
    const fullPath = this.getFullPath(relativePath);
    await fs.promises.unlink(fullPath);
  }

  async deleteDirectory(relativePath: string): Promise<void> {
    const fullPath = this.getFullPath(relativePath);
    await fs.promises.rm(fullPath, { recursive: true, force: true });
  }

  async exists(relativePath: string): Promise<boolean> {
    try {
      const fullPath = this.getFullPath(relativePath);
      await fs.promises.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  async getFileStats(relativePath: string): Promise<fs.Stats> {
    const fullPath = this.getFullPath(relativePath);
    return fs.promises.stat(fullPath);
  }

  async rename(oldPath: string, newPath: string): Promise<void> {
    const fullOldPath = this.getFullPath(oldPath);
    const fullNewPath = this.getFullPath(newPath);
    await fs.promises.rename(fullOldPath, fullNewPath);
  }

  async copyFile(srcPath: string, destPath: string): Promise<void> {
    const fullSrcPath = this.getFullPath(srcPath);
    const fullDestPath = this.getFullPath(destPath);
    const destDir = path.dirname(fullDestPath);

    await fs.promises.mkdir(destDir, { recursive: true });
    await fs.promises.copyFile(fullSrcPath, fullDestPath);
  }
}
```

---

## Migration Steps

### Step 1: Remove Legacy Dependencies

```bash
npm uninstall smb2
npm uninstall cross-env  # nếu không dùng nữa
```

### Step 2: Update SmbService

- Replace SMB2 client với `fs.promises`
- Implement platform detection (Windows/Linux)
- Update all methods to use file system APIs
- Remove `ensureClient()` và lazy initialization

### Step 3: Update Configuration

**Development (.env):**

```env
# Windows: Direct UNC or mounted drive
SMB_SERVER=10.0.60.30
SMB_SHARE=Public
SMB_BASE_PATH=IT-Information Technology Dept\devTest
SMB_USE_MOUNTED_DRIVE=false  # true nếu dùng Z:\ drive
SMB_MOUNTED_DRIVE=Z:
```

**Production (.env.production):**

```env
# Linux: Mounted path (from Docker volume)
SMB_MOUNT_PATH=/shared
```

### Step 4: Setup Mount Automation

**Development (Windows) - Optional:**

```bash
# Create mount script: scripts/mount-smb.ps1
net use Z: \\10.0.60.30\Public /user:bestpacific.com\user password /persistent:yes
```

**Production (Linux) - Required:**

```bash
# Create systemd service: /etc/systemd/system/smb-mount.service
[Unit]
Description=Mount SMB Share
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
ExecStart=/usr/bin/mount -t cifs //10.0.60.30/Public /mnt/smb -o username=user,password=pass,domain=bestpacific.com,uid=1000,gid=1000,file_mode=0664,dir_mode=0775
ExecStop=/usr/bin/umount /mnt/smb
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
```

### Step 5: Update Docker Compose

```yaml
# docker-compose.prod.yml
services:
  api:
    volumes:
      - ${SMB_MOUNT_PATH:-/mnt/smb}:/shared # Mount từ host
    environment:
      - SMB_MOUNT_PATH=/shared # Path trong container
```

### Step 6: High Availability Setup

**Architecture:**

```
┌─────────────┐     ┌─────────────┐
│ Load Balancer│────▶│ Ubuntu Server 1 │───┐
│  (Nginx)     │     │  (Docker API)   │   │
└─────────────┘     └─────────────────┘   │
                                           │
┌─────────────┐     ┌─────────────┐       │
│ Load Balancer│────▶│ Ubuntu Server 2 │───┼──▶ SMB Share
│  (Nginx)     │     │  (Docker API)   │   │    (10.0.60.30)
└─────────────┘     └─────────────────┘   │
                                           │
                              ┌────────────┘
                              │
                    ┌─────────▼─────────┐
                    │  Shared Storage   │
                    │  (SMB Mount)      │
                    │  /mnt/smb         │
                    └───────────────────┘
```

**Setup trên mỗi server:**

1. Mount SMB share: `/mnt/smb`
2. Deploy Docker containers với volume mount
3. Configure load balancer với health checks
4. Setup shared database (PostgreSQL với replication)

### Step 7: Testing

**Development:**

- Test trên Windows với UNC paths
- Test với mounted drive (nếu dùng)
- Test file operations (read, write, list, delete)
- Test streaming

**Production:**

- Test mount persistence (restart server)
- Test với Docker volumes
- Test file operations
- Test high availability (failover)

### Step 8: Documentation

- Update deployment guide với mount instructions
- Document high availability setup
- Add troubleshooting section
- Document authentication setup

---

## Success Metrics

- ✅ **Zero legacy dependencies** - không cần OpenSSL flags
- ✅ **Simpler codebase** - ít dependencies, dễ maintain
- ✅ **Better performance** - native OS access
- ✅ **Production stability** - standard Node.js APIs
- ✅ **Cross-platform ready** - có thể extend cho Linux

---

## High Availability Architecture

### 2-Server Setup với Shared Storage

**Requirements:**

- 2 Ubuntu servers (Server 1, Server 2)
- Cùng mount SMB share (`/mnt/smb`)
- Load balancer phía trước (Nginx/HAProxy)
- Shared database (PostgreSQL với replication hoặc external DB)

**Benefits:**

- ✅ **Redundancy:** Nếu 1 server down, server kia vẫn hoạt động
- ✅ **Load distribution:** Traffic được phân tán
- ✅ **Zero-downtime deployment:** Deploy từng server một
- ✅ **Shared storage:** Cả 2 servers access cùng files

**Considerations:**

- ⚠️ **File locking:** Cần handle concurrent writes (SMB có file locking)
- ⚠️ **Cache consistency:** Có thể cần cache invalidation
- ⚠️ **Database sync:** PostgreSQL replication hoặc external DB

### Load Balancer Configuration

```nginx
# /etc/nginx/sites-available/iso-docs
upstream api_backend {
    least_conn;  # Load balancing method
    server server1.internal:3001 max_fails=3 fail_timeout=30s;
    server server2.internal:3001 max_fails=3 fail_timeout=30s;
    keepalive 32;
}

server {
    listen 80;
    server_name api.yourdomain.com;

    location /api {
        proxy_pass http://api_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

        # Health check
        proxy_next_upstream error timeout invalid_header http_500 http_502 http_503;
    }
}
```

---

## Open Questions

1. ✅ **Deployment environment:** Đã xác định - Dev: Windows, Prod: Ubuntu
2. **Authentication method:** Service account hay credentials trong mount command?
3. **Mount persistence:** Auto-remount nếu disconnect?
4. **File locking strategy:** Handle concurrent writes như thế nào?
5. **Database strategy:** PostgreSQL replication hay external managed DB?

---

## Next Steps

1. ✅ **Confirm deployment platform** - Done: Windows (dev), Ubuntu (prod)
2. **Choose authentication strategy** - Service account recommended
3. **Implement Hybrid Solution** - Platform-aware file system access
4. **Setup mount automation** - Systemd service cho Linux
5. **Test thoroughly** - Dev (Windows) và Prod (Linux)
6. **Plan high availability** - 2-server setup với load balancer
7. **Update documentation** - Deployment guide với HA setup

---

## Final Decision

**Implement Hybrid Solution: Platform-Aware File System Access**

- **Development (Windows):** UNC paths hoặc mounted drive
- **Production (Linux):** Mounted SMB share (`/mnt/smb`) → Docker volume (`/shared`)
- **High Availability:** 2 Ubuntu servers mount chung storage, load balancer phía trước
- **No legacy dependencies:** Remove `smb2`, `cross-env`, không cần OpenSSL flags
- **Standard APIs:** Chỉ dùng Node.js `fs` module

**Benefits:**

- ✅ Simple & maintainable
- ✅ Cross-platform support
- ✅ Production-ready
- ✅ High availability ready
- ✅ No legacy issues

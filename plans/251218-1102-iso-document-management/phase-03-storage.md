# Phase 3: Storage & File Management

**Status:** 🟢 Completed  
**Priority:** P0 - Critical  
**Estimated Time:** 3-4 days  
**Completed Date:** 2024-12-19

---

## Context

Kết nối NestJS với shared folder qua SMB/CIFS, xây dựng API quản lý file/folder, và streaming cho hiển thị web.

## Requirements

- [x] Connect to SMB shared folder
- [x] List files/folders API
- [x] Read file stream API
- [x] Upload file API
- [x] Create/rename/delete folder API
- [x] File metadata extraction
- [x] Sync state between DB and filesystem (folders + documents)

## Database Schema

```prisma
model Folder {
  id          String    @id @default(uuid())
  name        String
  path        String    @unique  // SMB path
  parentId    String?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  parent      Folder?   @relation("FolderHierarchy", fields: [parentId], references: [id])
  children    Folder[]  @relation("FolderHierarchy")
  documents   Document[]
  permissions FolderPermission[]
}

model Document {
  id          String    @id @default(uuid())
  name        String
  fileName    String
  fileType    String    // pdf, docx, xlsx, etc.
  fileSize    Int
  filePath    String    // SMB path to current version
  checksum    String
  folderId    String
  status      DocumentStatus @default(ACTIVE)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  folder      Folder    @relation(fields: [folderId], references: [id])
  versions    DocumentVersion[]
  permissions DocumentPermission[]
}

enum DocumentStatus {
  ACTIVE
  ARCHIVED
  DELETED
}
```

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────────┐
│   Next.js   │────▶│   NestJS    │────▶│  SMB Shared     │
│   Frontend  │     │   Backend   │     │  Folder         │
└─────────────┘     └──────┬──────┘     └─────────────────┘
                          │
                    ┌─────▼─────┐
                    │ PostgreSQL │
                    │ (Metadata) │
                    └───────────┘
```

## API Endpoints

| Method | Endpoint                          | Description         |
| ------ | --------------------------------- | ------------------- |
| GET    | `/storage/folders`                | List root folders   |
| GET    | `/storage/folders/:id`            | Get folder contents |
| POST   | `/storage/folders`                | Create folder       |
| PATCH  | `/storage/folders/:id`            | Rename folder       |
| DELETE | `/storage/folders/:id`            | Delete folder       |
| GET    | `/storage/documents/:id`          | Get document info   |
| GET    | `/storage/documents/:id/stream`   | Stream file content |
| GET    | `/storage/documents/:id/download` | Download file       |
| POST   | `/storage/documents/upload`       | Upload document     |

## Implementation Steps

### 3.1 SMB Service

**Implementation:** Platform-aware file system access using Node.js `fs` module

**Development (Windows):**

- Direct UNC paths: `\\10.0.60.30\Public\...`
- Or mounted drive: `Z:\...` (if `SMB_USE_MOUNTED_DRIVE=true`)

**Production (Linux):**

- Mounted SMB share: `/mnt/smb` (on host) → `/shared` (in container)

```typescript
// src/modules/storage/services/smb.service.ts
import * as fs from "fs";
import * as path from "path";

@Injectable()
export class SmbService {
  private basePath: string;

  constructor(private config: ConfigService) {
    if (process.platform === "win32") {
      // Windows: UNC path or mounted drive
      this.basePath = `\\\\${server}\\${share}\\${basePath}`;
    } else {
      // Linux: Mounted path
      this.basePath = config.get("SMB_MOUNT_PATH", "/shared");
    }
  }

  async listDirectory(path: string): Promise<FileInfo[]> {
    return fs.promises.readdir(fullPath, { withFileTypes: true });
  }

  async readFileStream(path: string): Promise<Readable> {
    return fs.createReadStream(fullPath);
  }

  async writeFile(path: string, buffer: Buffer): Promise<void> {
    await fs.promises.writeFile(fullPath, buffer);
  }

  // ... other methods using fs.promises
}
```

### 3.2 Storage Module Structure

```
src/modules/storage/
├── storage.module.ts
├── controllers/
│   ├── folder.controller.ts
│   └── document.controller.ts
├── services/
│   ├── smb.service.ts
│   ├── folder.service.ts
│   └── document.service.ts
└── dto/
    ├── create-folder.dto.ts
    └── upload-document.dto.ts
```

### 3.3 File Streaming

```typescript
@Get(':id/stream')
async streamDocument(
  @Param('id') id: string,
  @Res() res: Response,
) {
  const doc = await this.documentService.findById(id);
  const stream = await this.smbService.readFileStream(doc.filePath);

  res.setHeader('Content-Type', this.getMimeType(doc.fileType));
  res.setHeader('Content-Disposition', 'inline');
  stream.pipe(res);
}
```

## Environment Variables

**Development (Windows):**

```env
# SMB Configuration - Direct UNC or mounted drive
SMB_SERVER=10.0.60.30
SMB_SHARE=Public
SMB_BASE_PATH=IT-Information Technology Dept\devTest
SMB_USE_MOUNTED_DRIVE=false  # true if using mapped drive
SMB_MOUNTED_DRIVE=Z:  # Only if SMB_USE_MOUNTED_DRIVE=true
```

**Production (Linux):**

```env
# SMB Configuration - Mounted path
SMB_MOUNT_PATH=/shared  # Path in container (from Docker volume)
```

**Mount Setup (Linux - Production):**

**1. Install cifs-utils:**

```bash
sudo apt-get update
sudo apt-get install cifs-utils
```

**2. Create credentials file:**

```bash
sudo nano /etc/smb-credentials
# username=your-username
# password=your-password
# domain=bestpacific.com
sudo chmod 600 /etc/smb-credentials
```

**3. Create mount script:**

```bash
sudo nano /usr/local/bin/mount-smb.sh
# (See deployment-guide.md for full script)
sudo chmod +x /usr/local/bin/mount-smb.sh
```

**4. Create systemd service:**

```bash
sudo nano /etc/systemd/system/smb-mount.service
# (See deployment-guide.md for full service file)
sudo systemctl daemon-reload
sudo systemctl enable smb-mount.service
sudo systemctl start smb-mount.service
```

**5. Docker volume mount (docker-compose.prod.yml):**

```yaml
services:
  api:
    volumes:
      - /mnt/smb:/shared # Mount from host to container
    environment:
      - SMB_MOUNT_PATH=/shared
```

**6. Verify:**

```bash
# Check mount
ls /mnt/smb
mount | grep smb

# Test container access
docker-compose exec api ls /shared
```

**Reference:** See `docs/deployment-guide.md` for detailed setup instructions.

## Todo List

- [x] Install smb2 package (Refactored to fs module)
- [x] Create SmbService with connection handling
- [x] Implement folder CRUD operations
- [x] Implement document upload/download
- [x] Create file streaming endpoint
- [x] Build folder tree component in frontend
- [x] Create file browser UI
- [x] Implement upload with progress
- [x] Add file type icons and metadata display
- [x] Implement document sync from file system

## Success Criteria

- ✅ List files from SMB share in web UI (via sync)
- ✅ Navigate folder tree
- ✅ Upload files to specific folders
- ✅ Stream files for viewing
- ✅ Download files with proper headers
- ✅ Sync existing files from SMB share to database

## Performance Considerations

- Connection pooling for SMB
- Stream large files instead of buffering
- Cache folder listings (short TTL)
- Chunked upload for large files

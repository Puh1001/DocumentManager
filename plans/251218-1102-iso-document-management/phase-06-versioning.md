# Phase 6: Version Control

**Status:** 🔴 Pending  
**Priority:** P1 - High  
**Estimated Time:** 2-3 days

---

## Context

Xây dựng hệ thống quản lý phiên bản tài liệu, theo dõi lịch sử thay đổi, và cho phép phục hồi phiên bản cũ.

## Requirements

- [ ] Track document versions on upload
- [ ] Store version metadata in database
- [ ] Keep all file versions on disk
- [ ] View version history
- [ ] Compare versions (diff)
- [ ] Restore previous version
- [ ] Version naming convention

## Version Storage Strategy

### File System Structure

```
/SharedFolder/documents/
├── {documentId}/
│   ├── current/
│   │   └── document.pdf
│   └── versions/
│       ├── v001_20241218_103000_userId123.pdf
│       ├── v002_20241218_153000_userId456.pdf
│       └── v003_20241219_091500_userId123.pdf
```

### Naming Convention

```
v{version}_{YYYYMMDD}_{HHmmss}_{userId}.{ext}
```

## Database Schema

```prisma
model DocumentVersion {
  id          String   @id @default(uuid())
  documentId  String
  version     Int
  fileName    String   // Original filename
  filePath    String   // Path to versioned file
  fileSize    Int
  checksum    String   // MD5/SHA256 for integrity
  comment     String?  // Optional change description
  createdBy   String
  createdAt   DateTime @default(now())

  document    Document @relation(fields: [documentId], references: [id])
  user        User     @relation(fields: [createdBy], references: [id])

  @@unique([documentId, version])
  @@index([documentId])
}
```

## API Endpoints

| Method | Endpoint                                    | Description               |
| ------ | ------------------------------------------- | ------------------------- |
| GET    | `/documents/:id/versions`                   | List all versions         |
| GET    | `/documents/:id/versions/:version`          | Get specific version info |
| GET    | `/documents/:id/versions/:version/download` | Download specific version |
| POST   | `/documents/:id/versions`                   | Upload new version        |
| POST   | `/documents/:id/versions/:version/restore`  | Restore as current        |
| GET    | `/documents/:id/versions/compare`           | Compare two versions      |

## Implementation

### Version Service

```typescript
// src/modules/storage/services/version.service.ts
@Injectable()
export class VersionService {
  constructor(private prisma: PrismaService, private smbService: SmbService) {}

  async createVersion(
    documentId: string,
    file: Buffer,
    userId: string,
    comment?: string
  ): Promise<DocumentVersion> {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
      include: { versions: { orderBy: { version: "desc" }, take: 1 } },
    });

    const nextVersion = (document.versions[0]?.version || 0) + 1;
    const timestamp = format(new Date(), "yyyyMMdd_HHmmss");
    const versionFileName = `v${String(nextVersion).padStart(
      3,
      "0"
    )}_${timestamp}_${userId}${path.extname(document.fileName)}`;
    const versionPath = `${document.id}/versions/${versionFileName}`;

    // Calculate checksum
    const checksum = crypto.createHash("sha256").update(file).digest("hex");

    // Save to SMB
    await this.smbService.writeFile(versionPath, file);

    // Update current
    const currentPath = `${document.id}/current/${document.fileName}`;
    await this.smbService.writeFile(currentPath, file);

    // Save to DB
    const version = await this.prisma.documentVersion.create({
      data: {
        documentId,
        version: nextVersion,
        fileName: document.fileName,
        filePath: versionPath,
        fileSize: file.length,
        checksum,
        comment,
        createdBy: userId,
      },
    });

    // Update document
    await this.prisma.document.update({
      where: { id: documentId },
      data: {
        filePath: currentPath,
        fileSize: file.length,
        checksum,
        updatedAt: new Date(),
      },
    });

    return version;
  }

  async listVersions(documentId: string): Promise<DocumentVersion[]> {
    return this.prisma.documentVersion.findMany({
      where: { documentId },
      orderBy: { version: "desc" },
      include: { user: { select: { id: true, fullName: true, email: true } } },
    });
  }

  async restoreVersion(
    documentId: string,
    version: number,
    userId: string
  ): Promise<DocumentVersion> {
    const oldVersion = await this.prisma.documentVersion.findUnique({
      where: { documentId_version: { documentId, version } },
    });

    // Read old version file
    const file = await this.smbService.readFile(oldVersion.filePath);

    // Create new version from restored content
    return this.createVersion(
      documentId,
      file,
      userId,
      `Restored from version ${version}`
    );
  }
}
```

### Version History Component

```tsx
// components/documents/VersionHistory.tsx
interface VersionHistoryProps {
  documentId: string;
}

export function VersionHistory({ documentId }: VersionHistoryProps) {
  const { versions, isLoading } = useDocumentVersions(documentId);
  const { canEdit } = useDocumentPermissions(documentId);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Version History</h3>

      <div className="space-y-2">
        {versions?.map((version, index) => (
          <div
            key={version.id}
            className="flex items-center justify-between p-3 border rounded-lg"
          >
            <div className="flex items-center gap-3">
              <Badge variant={index === 0 ? "default" : "secondary"}>
                v{version.version}
              </Badge>
              <div>
                <p className="text-sm font-medium">{version.user.fullName}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(version.createdAt)}
                </p>
              </div>
              {version.comment && (
                <p className="text-sm text-muted-foreground">
                  {version.comment}
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <Button variant="ghost" size="sm" asChild>
                <a
                  href={`/api/documents/${documentId}/versions/${version.version}/download`}
                >
                  Download
                </a>
              </Button>
              {canEdit && index > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRestore(version.version)}
                >
                  Restore
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

## Todo List

- [ ] Design version storage structure on SMB
- [ ] Create DocumentVersion model
- [ ] Implement VersionService
- [ ] Add version API endpoints
- [ ] Build version history UI component
- [ ] Implement restore functionality
- [ ] Add version comparison (optional)
- [ ] Test with various file types

## Success Criteria

- Every upload creates a new version
- All versions stored with consistent naming
- Version history viewable in UI
- Old versions downloadable
- Restore creates new version from old content
- Checksums validate file integrity

## Notes

- Consider retention policy (e.g., keep last 50 versions)
- Large files may need storage optimization
- Version comparison only for text-based formats

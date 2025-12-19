# Phase 7: Local Edit Integration

**Status:** 🔴 Pending  
**Priority:** P2 - Medium  
**Estimated Time:** 2 days

---

## Context

Tính năng "Thủ thư" - cho phép người dùng mở file và thư mục trực tiếp từ ổ chung trong ứng dụng local (Word, Excel, etc.).

## Requirements

- [ ] "Open to Edit" button for documents
- [ ] "Open Folder" button for directories
- [ ] Handle different OS (Windows focus)
- [ ] Permission check before opening
- [ ] Audit logging for edits

## Challenge: Browser Security

Modern browsers block `file://` protocol for security reasons. Solutions:

### Solution 1: Custom URI Protocol Handler (Recommended)

Register custom protocol `docmanager://` that launches a small local helper app.

### Solution 2: Direct Network Path (Windows Only)

Use SMB path format that Windows Explorer can handle:

```
\\192.168.1.x\SharedFolder\path\to\file.docx
```

### Solution 3: Download + Open Hint

Download file with suggested app association.

## Implementation

### Backend: Generate Open URLs

```typescript
// src/modules/storage/services/local-edit.service.ts
@Injectable()
export class LocalEditService {
  constructor(private config: ConfigService) {}

  getOpenFileUrl(document: Document): string {
    const basePath = this.config.get("SMB_NETWORK_PATH"); // e.g., \\192.168.1.x\SharedFolder
    const fullPath = `${basePath}\\${document.filePath.replace(/\//g, "\\\\")}`;

    // Return as file:// URL for Windows
    return `file:///${fullPath.replace(/\\\\/g, "/")}`;
  }

  getOpenFolderUrl(folder: Folder): string {
    const basePath = this.config.get("SMB_NETWORK_PATH");
    const fullPath = `${basePath}\\${folder.path.replace(/\//g, "\\\\")}`;

    return `file:///${fullPath.replace(/\\\\/g, "/")}`;
  }

  // For Windows Explorer command
  getExplorerCommand(path: string): string {
    const basePath = this.config.get("SMB_NETWORK_PATH");
    return `explorer.exe "${basePath}\\${path.replace(/\//g, "\\\\")}"`;
  }
}
```

### API Endpoint

```typescript
// src/modules/storage/controllers/document.controller.ts
@Get(':id/open-path')
@UseGuards(JwtAuthGuard, PoliciesGuard)
@CheckPolicies((ability) => ability.can('edit', 'Document'))
async getOpenPath(@Param('id') id: string) {
  const document = await this.documentService.findById(id);

  // Log edit intent
  await this.auditService.log({
    action: 'OPEN_FOR_EDIT',
    resourceType: 'Document',
    resourceId: id,
  });

  return {
    networkPath: this.localEditService.getNetworkPath(document),
    fileUrl: this.localEditService.getOpenFileUrl(document),
    explorerCommand: this.localEditService.getExplorerCommand(document.filePath),
  };
}
```

### Frontend: Open Button Component

```tsx
// components/documents/OpenLocalButton.tsx
interface OpenLocalButtonProps {
  documentId: string;
  canEdit: boolean;
}

export function OpenLocalButton({ documentId, canEdit }: OpenLocalButtonProps) {
  const [showInstructions, setShowInstructions] = useState(false);

  const handleOpen = async () => {
    const { data } = await api.get(`/documents/${documentId}/open-path`);

    // Try to open via file:// URL
    const link = document.createElement("a");
    link.href = data.fileUrl;
    link.click();

    // Show instructions if browser blocks
    setShowInstructions(true);
  };

  if (!canEdit) return null;

  return (
    <>
      <Button onClick={handleOpen} variant="outline">
        <Edit2 className="mr-2 h-4 w-4" />
        Open to Edit
      </Button>

      <Dialog open={showInstructions} onOpenChange={setShowInstructions}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Open in Local Application</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              If the file didn't open automatically, copy the path below and
              paste in File Explorer:
            </p>
            <div className="flex items-center gap-2">
              <Input value={networkPath} readOnly />
              <Button
                variant="outline"
                onClick={() => copyToClipboard(networkPath)}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Or run this command in Windows Run (Win+R):
            </p>
            <code className="block p-2 bg-muted rounded text-sm">
              explorer.exe "{networkPath}"
            </code>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
```

### Open Folder Component

```tsx
// components/folders/OpenFolderButton.tsx
export function OpenFolderButton({ folderId }: { folderId: string }) {
  const handleOpenFolder = async () => {
    const { data } = await api.get(`/folders/${folderId}/open-path`);

    // Attempt to open folder
    window.location.href = data.fileUrl;
  };

  return (
    <Button onClick={handleOpenFolder} variant="ghost" size="sm">
      <FolderOpen className="mr-2 h-4 w-4" />
      Open in Explorer
    </Button>
  );
}
```

## File Change Detection (Advanced)

To detect when user saves changes in local app:

### Option 1: Polling

Check file modification time periodically via API.

### Option 2: File Watcher

Run background job to watch for changes on SMB share.

```typescript
// src/modules/storage/services/file-watcher.service.ts
@Injectable()
export class FileWatcherService implements OnModuleInit {
  onModuleInit() {
    this.startWatching();
  }

  private async startWatching() {
    // Poll for changes every 30 seconds
    setInterval(async () => {
      const documents = await this.getActiveDocuments();

      for (const doc of documents) {
        const currentChecksum = await this.calculateChecksum(doc.filePath);

        if (currentChecksum !== doc.checksum) {
          // File changed - create new version
          await this.versionService.createVersionFromChange(doc.id);
        }
      }
    }, 30000);
  }
}
```

## Todo List

- [ ] Create LocalEditService
- [ ] Add open-path API endpoint
- [ ] Build OpenLocalButton component
- [ ] Build OpenFolderButton component
- [ ] Add copy-to-clipboard functionality
- [ ] Create instruction dialog
- [ ] Implement file change detection (optional)
- [ ] Add audit logging for edits
- [ ] Test on Windows clients

## Success Criteria

- "Open to Edit" button visible for authorized users
- Network path copyable to clipboard
- Instructions clear for manual opening
- Folder opening works
- Edit actions logged

## Limitations

- Requires users to have network access to shared folder
- File change detection may have delay
- Cross-platform support limited

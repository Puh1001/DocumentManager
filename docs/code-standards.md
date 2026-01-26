# Code Standards

## General Principles

- **YAGNI**: You Aren't Gonna Need It - Don't over-engineer
- **KISS**: Keep It Simple, Stupid - Prefer simple solutions
- **DRY**: Don't Repeat Yourself - Extract common logic

## TypeScript

### Naming Conventions

- **Files**: `kebab-case.ts` (e.g., `auth-service.ts`)
- **Classes**: `PascalCase` (e.g., `AuthService`)
- **Functions**: `camelCase` (e.g., `validateUser`)
- **Constants**: `UPPER_SNAKE_CASE` (e.g., `JWT_SECRET`)
- **Interfaces**: `PascalCase` (e.g., `UserDto`)

### Type Safety

```typescript
// ✅ Good - explicit types
function getUser(id: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { id } });
}

// ❌ Bad - implicit any
function getUser(id) {
  return prisma.user.findUnique({ where: { id } });
}
```

## NestJS Backend

### Module Structure

```
src/modules/{feature}/
├── {feature}.module.ts
├── {feature}.controller.ts
├── {feature}.service.ts
├── dto/
│   ├── create-{feature}.dto.ts
│   └── update-{feature}.dto.ts
└── entities/
    └── {feature}.entity.ts
```

### Controllers

```typescript
@Controller("users")
@ApiTags("Users")
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: "List all users" })
  findAll(@Query() query: QueryUsersDto) {
    return this.usersService.findAll(query);
  }
}
```

### Services

```typescript
@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryUsersDto) {
    // Business logic here
  }
}
```

### DTOs

```typescript
import { IsString, IsEmail, MinLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreateUserDto {
  @ApiProperty({ example: "john.doe" })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({ example: "john@example.com" })
  @IsEmail()
  email: string;
}
```

## Next.js Frontend

### File Organization

```
src/
├── app/              # App Router pages
├── components/
│   ├── ui/          # Reusable UI components
│   └── {feature}/   # Feature-specific components
├── hooks/           # Custom hooks
└── lib/             # Utilities, API client
```

### Component Structure

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface MyComponentProps {
  title: string;
  onSubmit: () => void;
}

export function MyComponent({ title, onSubmit }: MyComponentProps) {
  const [loading, setLoading] = useState(false);

  return (
    <div className="p-4">
      <h1>{title}</h1>
      <Button onClick={onSubmit} disabled={loading}>
        Submit
      </Button>
    </div>
  );
}
```

### Hooks

```typescript
export function useDocument(id: string) {
  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get(`/documents/${id}`)
      .then(setDocument)
      .finally(() => setLoading(false));
  }, [id]);

  return { document, loading };
}
```

## Styling

### Tailwind CSS

```tsx
// ✅ Good - consistent spacing, colors
<div className="p-4 bg-background text-foreground rounded-lg shadow">
  <h1 className="text-lg font-semibold">Title</h1>
</div>

// ❌ Bad - magic values
<div style={{ padding: '17px', backgroundColor: '#f5f5f5' }}>
```

### ShadcnUI Components

```tsx
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// Use variants
<Button variant="outline" size="sm">Click</Button>
<Button variant="destructive">Delete</Button>
```

## API Design

### REST Conventions

```
GET    /api/users          # List
GET    /api/users/:id      # Get one
POST   /api/users          # Create
PATCH  /api/users/:id      # Update
DELETE /api/users/:id      # Delete
```

### Response Format

```typescript
// Success
{
  "data": { ... },
  "message": "User created successfully"
}

// Error
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [...]
}

// Pagination
{
  "data": [...],
  "total": 100,
  "page": 1,
  "limit": 20,
  "totalPages": 5
}
```

## Error Handling

### Backend

```typescript
@Injectable()
export class UsersService {
  async findById(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    return user;
  }
}
```

### Frontend

```typescript
try {
  const user = await api.get("/users/123");
} catch (error) {
  if (error.message === "User not found") {
    // Handle not found
  }
  // Show error toast
}
```

## Testing

### Unit Tests

```typescript
describe("AuthService", () => {
  it("should validate user with correct password", async () => {
    const user = await service.validateUser("admin", "admin123");
    expect(user).toBeDefined();
    expect(user.username).toBe("admin");
  });
});
```

## KPI Attachment Patterns

### Backend: Auto-Folder Creation

```typescript
// ✅ Good - Auto-create department KPI folder structure if folderId not provided
async uploadAttachment(
  kpiRecordId: string,
  file: Express.Multer.File,
  folderId: string | undefined, // Optional - backend will auto-create if not provided
  description: string | undefined,
  user: UserWithDepartments
) {
  // Find or create folder for department if folderId is not provided
  let targetFolderId = folderId;
  if (!targetFolderId) {
    targetFolderId = await this.findOrCreateDepartmentKpiFolder(
      record.departmentId
    );
  }
  
  // Continue with upload...
}

// ✅ Good - Handle race conditions when creating folders
private async findOrCreateDepartmentKpiFolder(departmentId: string) {
  // Try to find by path first (more reliable than departmentId)
  let departmentFolder = await this.prisma.folder.findUnique({
    where: { path: folderPath },
  });

  if (!departmentFolder) {
    await this.smbService.createDirectory(folderPath);
    
    try {
      departmentFolder = await this.prisma.folder.create({
        data: { name, path: folderPath, parentId, departmentId },
      });
    } catch (error) {
      // Handle race condition: folder might have been created by another request
      if (error.code === "P2002") {
        // Fetch the existing folder
        departmentFolder = await this.prisma.folder.findUnique({
          where: { path: folderPath },
        });
      } else {
        throw error;
      }
    }
  }
  
  // Find or create subfolders (KPI -> current)
  // ...
}
```

### Backend: Optional folderId in DTO

```typescript
// ✅ Good - Make folderId optional with conditional validation
export class CreateKpiAttachmentDto {
  @ApiProperty({
    description: "Target folder ID. If not provided, will auto-create department/KPI/current folder structure",
    required: false,
  })
  @ValidateIf((o) => o.folderId !== undefined && o.folderId !== null && o.folderId !== "")
  @IsUUID()
  @IsOptional()
  folderId?: string;
}
```

### Backend: File Deletion with Move to Delete Folder

```typescript
// ✅ Good - Move file to delete folder instead of hard deletion
async deleteAttachment(attachmentId: string, user: UserWithDepartments) {
  // Load document and folder
  const document = await this.documentService.findById(attachment.documentId);
  const currentFolder = await this.folderService.findById(document.folderId);
  
  // Find or create "delete files" folder in department
  const deleteFolder = await this.findOrCreateDeleteFolder(
    departmentId,
    currentFolder
  );
  
  // Move file physically
  await this.smbService.rename(oldFilePath, newFilePath);
  
  // Update document record
  await this.prisma.document.update({
    where: { id: document.id },
    data: {
      folderId: deleteFolder.id,
      filePath: newFilePath,
      status: "DELETED",
    },
  });
}
```

### Frontend: Optional folderId Handling

```typescript
// ✅ Good - Pass undefined instead of empty string when folderId is not available
const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  setUploading(true);
  try {
    const result = await kpiAttachmentApi.uploadAttachment(
      kpiRecordId,
      file,
      folderId, // Can be undefined - backend will auto-create folder
      undefined
    );
    // ...
  } catch (error) {
    // ...
  }
};

// ✅ Good - Conditionally include folderId in API request
export const kpiAttachmentApi = {
  uploadAttachment: (
    kpiRecordId: string,
    file: File,
    folderId: string | undefined,
    description?: string
  ) =>
    api.upload(`/kpi/records/${kpiRecordId}/attachments`, file, {
      // Only include folderId if it's a valid non-empty string
      ...(folderId && folderId.trim() !== "" && { folderId }),
      ...(description && { description }),
    }),
};
```

### Frontend: Component Variant Pattern

```typescript
// ✅ Good - Support multiple styling variants
interface KpiAttachmentListProps {
  variant?: "default" | "cyber"; // Style variant
}

export function KpiAttachmentList({
  variant = "default",
  ...props
}: KpiAttachmentListProps) {
  const containerClass = variant === "cyber"
    ? "cyber-themed-classes"
    : "standard-classes";
    
  return <div className={containerClass}>...</div>;
}

// Usage
<KpiAttachmentList variant="cyber" />  // Boss UI
<KpiAttachmentList />                  // Regular UI (default)
```

## Document Deletion Patterns

### Backend: Deletion Status Check

```typescript
// ✅ Good - Check deletion status before allowing deletion
@Get(':id/deletion-status')
async getDeletionStatus(
  @Param('id') id: string,
  @Request() req: AuthenticatedRequest,
) {
  return this.deletionService.checkDeletionStatus(id, req.user.id);
}

// ✅ Good - Deletion service checks 72-hour window
async checkDeletionStatus(
  documentId: string,
  userId: string,
): Promise<DeletionStatus> {
  const document = await this.documentService.findById(documentId);
  const isExpired = now >= (document.deletionExpiresAt || calculatedExpiry);
  const canSelfDelete = (isUploader || isSameDepartment) && !isExpired;
  
  return {
    canDelete: canSelfDelete,
    isExpired,
    remainingHours: this.calculateRemainingHours(expiresAt),
    requiresDCCApproval: isExpired,
    hasActiveRequest: !!activeRequest,
  };
}
```

### Backend: Deletion Request Submission

```typescript
// ✅ Good - Submit deletion request with optional replacement file
async submitDeletionRequest(
  documentId: string,
  userId: string,
  reason: string,
  replacementFileId?: string,
) {
  const status = await this.checkDeletionStatus(documentId, userId);
  
  if (!status.requiresDCCApproval) {
    throw new BadRequestException(
      'You can still delete this document directly. DCC approval only required after 72 hours.',
    );
  }
  
  if (status.hasActiveRequest) {
    throw new BadRequestException(
      'A deletion request for this document already exists',
    );
  }
  
  // Handle resubmission of rejected requests
  const existingRequest = await this.prisma.deletionRequest.findUnique({
    where: { documentId },
  });
  
  if (existingRequest && existingRequest.status === 'REJECTED') {
    // Resubmit rejected request
    return this.prisma.deletionRequest.update({
      where: { id: existingRequest.id },
      data: { status: 'PENDING', reason, replacementFileId },
    });
  }
  
  // Create new request
  return this.prisma.deletionRequest.create({
    data: { documentId, requestedBy: userId, reason, replacementFileId },
  });
}
```

### Backend: File Deletion with Move to Delete Folder

```typescript
// ✅ Good - Move file to delete folder instead of hard deletion
private async executeDelete(
  documentId: string,
  userId: string,
  reason: string,
): Promise<void> {
  const document = await this.documentService.findById(documentId);
  const currentFolder = await this.folderService.findById(document.folderId);
  
  // Find or create "delete files" folder in department
  const deleteFolder = await this.findOrCreateDeleteFolder(departmentId);
  
  const oldFilePath = document.filePath;
  const newFilePath = path.join(deleteFolder.path, path.basename(oldFilePath));
  
  // Move file physically
  await this.smbService.rename(oldFilePath, newFilePath);
  
  // Update document record in transaction
  await this.prisma.$transaction(async (tx) => {
    await tx.document.update({
      where: { id: documentId },
      data: {
        folderId: deleteFolder.id,
        filePath: newFilePath,
        status: 'DELETED',
      },
    });
    
    await tx.auditLog.create({
      data: {
        userId,
        action: 'DELETE',
        resourceType: 'Document',
        resourceId: documentId,
        details: { reason, originalPath: oldFilePath, newPath: newFilePath },
      },
    });
  });
}
```

### Frontend: Deletion Status Check

```typescript
// ✅ Good - Use hook to check deletion status
export function useDeletionStatus(documentId: string) {
  const [status, setStatus] = useState<DeletionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (!documentId) return;
    
    deletionRequestApi
      .getDeletionStatus(documentId)
      .then(setStatus)
      .finally(() => setLoading(false));
  }, [documentId]);
  
  return { status, loading, refetch: () => { /* refetch logic */ } };
}

// ✅ Good - Conditional rendering based on deletion status
export function DeletionActions({ documentId }: Props) {
  const { status, loading } = useDeletionStatus(documentId);
  
  if (loading || !status) return null;
  
  if (status.canDelete) {
    return <Button onClick={handleSelfDelete}>Delete</Button>;
  }
  
  if (status.requiresDCCApproval) {
    return (
      <Button onClick={() => setShowRequestDialog(true)}>
        Request Deletion
      </Button>
    );
  }
  
  return null;
}
```

### Frontend: Deletion Request Dialog

```typescript
// ✅ Good - Submit deletion request with replacement file
const handleSubmit = async () => {
  if (!reason.trim() || reason.trim().length < 10) {
    toast({ title: 'Error', description: 'Reason must be at least 10 characters' });
    return;
  }
  
  try {
    await deletionRequestApi.submitDeletionRequest(documentId, {
      reason: reason.trim(),
      replacementFileId: replacementFileId || undefined,
    });
    
    onSubmitted?.();
    onOpenChange(false);
  } catch (error) {
    toast({ title: 'Error', description: error.message });
  }
};
```

## Authorization Patterns

### Backend: CASL Ability Usage

```typescript
// ✅ Good - Use CheckPolicies decorator
@Controller("documents")
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class DocumentController {
  @Get(":id")
  @CheckPolicies({ action: "view", subject: "Document" })
  getDocument(@Param("id") id: string) {
    // Handler logic
  }
}

// ✅ Good - Use ability factory in service
@Injectable()
export class DocumentService {
  constructor(private readonly caslAbilityFactory: CaslAbilityFactory) {}

  async canUserAccess(userId: string, documentId: string) {
    const user = await this.getUser(userId);
    const ability = await this.caslAbilityFactory.createForUser(
      user.id,
      user.roles.map((r) => r.name)
    );
    return ability.can("view", { id: documentId, __typename: "Document" });
  }
}
```

### Frontend: Route Protection

```typescript
// ✅ Good - Use PageGuard component with page metadata
'use client';

import { PageGuard } from '@/components/page-guard';
import { pageMetadata } from './page';

export default function UsersPage() {
  return (
    <PageGuard metadata={pageMetadata}>
      {/* Page content */}
    </PageGuard>
  );
}

// ✅ Good - Export page metadata for auto-discovery
export const pageMetadata: PageMetadata = {
  path: '/dashboard/users',
  name: 'User Management',
  module: 'User',
  action: 'view',
  icon: 'Users',
  order: 5,
  requiresAuth: true,
};

// ✅ Good - Use useCanAccess hook for conditional rendering
import { useCanAccess } from '@/hooks/use-can-access';
import { AccessDenied } from '@/components/access-denied';

export default function UsersPage() {
  const canAccess = useCanAccess('view', 'User');

  if (!canAccess) {
    return <AccessDenied />;
  }

  // Page content
}

// ✅ Good - Filter navigation based on permissions
const canViewUsers = useCanAccess('view', 'User');
const canViewDepartments = useCanAccess('view', 'Department');

const navigation = [
  { name: 'Users', href: '/dashboard/users', show: canViewUsers },
  { name: 'Departments', href: '/dashboard/departments', show: canViewDepartments },
].filter(item => item.show);
```

### Permission Checks

```typescript
// ✅ Good - Backend: Explicit permission check
@CheckPolicies({ action: 'manage', subject: 'all' })

// ✅ Good - Backend: Resource-specific check
@CheckPolicies({ action: 'view', subject: 'Document' })

// ✅ Good - Frontend: Page-level check
const canAccess = useCanAccess('view', 'User');

// ❌ Bad - Missing permission check
@Get(':id')
getDocument(@Param('id') id: string) {
  // No permission check
}

// ❌ Bad - Frontend: No route protection
export default function UsersPage() {
  // No permission check - anyone can access
}

// ❌ Bad - Missing page metadata
export default function UsersPage() {
  // No pageMetadata export - page won't be auto-discovered
}
```

### Page Metadata Pattern

```typescript
// ✅ Good - Export page metadata for auto-discovery
import type { PageMetadata } from '@/lib/types/page-metadata';

export const pageMetadata: PageMetadata = {
  path: '/dashboard/users',
  name: 'User Management',
  module: 'User', // Must match Module.name in database
  action: 'view', // Optional, defaults to 'view'
  icon: 'Users', // Optional, Lucide icon name
  order: 5, // Optional, navigation order
  requiresAuth: true, // Optional, defaults to true
};

// ✅ Good - Register page in page-registry-init.ts
import '@/app/[locale]/dashboard/users/page';

// ✅ Good - Use PageGuard with metadata
import { PageGuard } from '@/components/page-guard';
import { pageMetadata } from './page';

export default function UsersPage() {
  return (
    <PageGuard metadata={pageMetadata}>
      {/* Page content */}
    </PageGuard>
  );
}
```

## Git Conventions

### Commit Messages

```
feat: add document version history
fix: correct permission check for download
docs: update API documentation
refactor: extract SMB service
test: add auth service tests
chore: update dependencies
```

### Branch Naming

```
feature/document-viewer
fix/permission-bypass
refactor/storage-module
```

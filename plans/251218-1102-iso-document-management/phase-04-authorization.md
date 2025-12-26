# Phase 4: Authorization (RBAC + ABAC)

**Status:** ✅ Completed  
**Priority:** P1 - High  
**Estimated Time:** 3-4 days

---

## Context

Xây dựng hệ thống phân quyền hybrid RBAC + ABAC với CASL, hỗ trợ phân quyền theo role, folder, document với các action cụ thể.

## Requirements

- [ ] Role-based access control (RBAC)
- [ ] Attribute-based access control (ABAC)
- [ ] Folder-level permissions
- [ ] Document-level permissions
- [ ] Permission inheritance
- [ ] Permission actions: view, download, print, edit, delete

## Permission Model

### RBAC Layer

```
Admin → Full access
Manager → CRUD on assigned folders
Editor → Create, Edit documents
Viewer → View only
```

### ABAC Attributes

- User: department, role, userId
- Resource: folderId, documentId, documentType, status
- Context: time, ipAddress

### Permission Actions

| Action     | Description                 |
| ---------- | --------------------------- |
| `view`     | Xem nội dung document       |
| `download` | Tải file về máy             |
| `print`    | In document                 |
| `edit`     | Mở để chỉnh sửa (local app) |
| `create`   | Tạo document mới            |
| `delete`   | Xóa document                |
| `manage`   | Quản lý permissions         |

## Database Schema

```prisma
model Permission {
  id          String   @id @default(uuid())
  name        String   @unique // view, download, print, edit, create, delete, manage
  description String?
}

model RolePermission {
  roleId       String
  permissionId String

  role         Role       @relation(fields: [roleId], references: [id])
  permission   Permission @relation(fields: [permissionId], references: [id])

  @@id([roleId, permissionId])
}

model FolderPermission {
  id           String   @id @default(uuid())
  folderId     String
  subjectType  SubjectType  // USER or ROLE
  subjectId    String
  permissionId String
  inherit      Boolean  @default(true) // Apply to subfolders

  folder       Folder     @relation(fields: [folderId], references: [id])
  permission   Permission @relation(fields: [permissionId], references: [id])

  @@unique([folderId, subjectType, subjectId, permissionId])
}

model DocumentPermission {
  id           String   @id @default(uuid())
  documentId   String
  subjectType  SubjectType
  subjectId    String
  permissionId String

  document     Document   @relation(fields: [documentId], references: [id])
  permission   Permission @relation(fields: [permissionId], references: [id])

  @@unique([documentId, subjectType, subjectId, permissionId])
}

enum SubjectType {
  USER
  ROLE
}
```

## CASL Implementation

### Define Abilities

```typescript
// src/modules/authorization/casl-ability.factory.ts
import {
  AbilityBuilder,
  createMongoAbility,
  MongoAbility,
} from "@casl/ability";

export type Actions =
  | "view"
  | "download"
  | "print"
  | "edit"
  | "create"
  | "delete"
  | "manage";
export type Subjects = "Document" | "Folder" | "User" | "all";

export type AppAbility = MongoAbility<[Actions, Subjects]>;

@Injectable()
export class CaslAbilityFactory {
  async createForUser(user: User): Promise<AppAbility> {
    const { can, cannot, build } = new AbilityBuilder<AppAbility>(
      createMongoAbility
    );

    // Load user roles and permissions from DB
    const userRoles = await this.loadUserRoles(user.id);
    const folderPerms = await this.loadFolderPermissions(user.id, userRoles);
    const docPerms = await this.loadDocumentPermissions(user.id, userRoles);

    // Admin can do anything
    if (userRoles.includes("admin")) {
      can("manage", "all");
    } else {
      // Apply folder permissions
      for (const perm of folderPerms) {
        can(perm.action, "Folder", { id: perm.folderId });
        if (perm.inherit) {
          can(perm.action, "Document", { folderId: perm.folderId });
        }
      }

      // Apply document permissions (override folder)
      for (const perm of docPerms) {
        can(perm.action, "Document", { id: perm.documentId });
      }
    }

    return build();
  }
}
```

### Guard Implementation

```typescript
// src/modules/authorization/guards/policies.guard.ts
@Injectable()
export class PoliciesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private caslAbilityFactory: CaslAbilityFactory
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const policyHandlers = this.reflector.get<PolicyHandler[]>(
      CHECK_POLICIES_KEY,
      context.getHandler()
    );

    if (!policyHandlers) return true;

    const { user } = context.switchToHttp().getRequest();
    const ability = await this.caslAbilityFactory.createForUser(user);

    return policyHandlers.every((handler) =>
      this.execPolicyHandler(handler, ability)
    );
  }
}
```

## API Endpoints

| Method | Endpoint                     | Description                |
| ------ | ---------------------------- | -------------------------- |
| GET    | `/permissions`               | List all permissions       |
| GET    | `/roles/:id/permissions`     | Get role permissions       |
| POST   | `/roles/:id/permissions`     | Assign permissions to role |
| GET    | `/folders/:id/permissions`   | Get folder permissions     |
| POST   | `/folders/:id/permissions`   | Set folder permissions     |
| GET    | `/documents/:id/permissions` | Get document permissions   |
| POST   | `/documents/:id/permissions` | Set document permissions   |

## Frontend Integration

```typescript
// hooks/useAbility.ts
export function useAbility() {
  const { user } = useAuth();
  const [ability, setAbility] = useState<AppAbility>();

  useEffect(() => {
    // Fetch abilities from API or compute client-side
  }, [user]);

  return ability;
}

// Usage
const ability = useAbility();
const canDownload = ability?.can("download", document);
```

## Todo List

- [x] Install @casl/ability and @casl/prisma
- [x] Create Permission, FolderPermission, DocumentPermission models
- [x] Implement CaslAbilityFactory
- [x] Create PoliciesGuard
- [x] Add permission decorators
- [x] Build permission management API
- [x] Create permission UI in admin panel
- [x] Implement conditional rendering based on permissions
- [x] Add audit log for permission changes
- [x] Create useAbility hook for frontend
- [x] Add abilities endpoint to auth controller

## Success Criteria

- Permissions checked on every API call
- UI elements hidden based on permissions
- Permission inheritance works for folders
- Admin can assign/revoke permissions
- Audit log for permission changes

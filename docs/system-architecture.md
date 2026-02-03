# System Architecture

**Last Updated:** 2026-01-26  
**Status:** Phase 1-4 Complete, Additional Features Added (80%)

---

## Overview

ISO Document Management System follows a **Librarian Model** architecture where the web application manages metadata and permissions, while actual file storage and editing happen directly on a shared network folder (SMB/CIFS).

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Layer                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Web UI     │  │  Windows     │  │  Mobile     │         │
│  │  (Next.js)   │  │  Explorer    │  │  (Future)   │         │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘         │
└─────────┼──────────────────┼──────────────────┼─────────────────┘
          │                  │                  │
          │ HTTP/REST        │ SMB/CIFS        │
          │                  │                  │
┌─────────▼──────────────────▼──────────────────▼─────────────────┐
│                      Application Layer                           │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              NestJS Backend API                          │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐ │  │
│  │  │  Auth   │  │  Users   │  │ Storage  │  │  Perms   │ │  │
│  │  │ Module │  │  Module  │  │  Module  │  │  Module  │ │  │
│  │  └─────────┘  └──────────┘  └──────────┘  └──────────┘ │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐            │  │
│  │  │  Dept   │  │   KPI    │  │  Maint   │            │  │
│  │  │ Module │  │  Module  │  │  Module  │            │  │
│  │  └─────────┘  └──────────┘  └──────────┘            │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────┬────────────────────────────────────────────────────────┘
          │
          ├──────────────────┬──────────────────┐
          │                  │                  │
┌─────────▼──────────┐  ┌────▼──────┐  ┌───────▼────────┐
│   PostgreSQL       │  │   Redis   │  │  SMB Shared    │
│   (Metadata)       │  │  (Cache)  │  │   Folder       │
│                    │  │           │  │  (Files)       │
│  - Users           │  │  - Rate   │  │                │
│  - Folders         │  │    limit  │  │  - Documents   │
│  - Documents       │  │  - Session│  │  - Versions    │
│  - Permissions     │  │           │  │                │
│  - Audit Logs      │  │           │  │                │
└────────────────────┘  └───────────┘  └────────────────┘
```

## Component Architecture

### Frontend (Next.js 14)

```
apps/web/
├── App Router (Server Components)
│   ├── [locale]/          # Internationalization
│   │   ├── /login              # Public login page
│   │   └── /dashboard          # Protected routes
│   │       ├── /documents      # ISO Document browser
│   │       ├── /departments    # Department management
│   │       ├── /kpi            # KPI tracking
│   │       └── /maintenance    # Maintenance notices
│
├── Client Components
│   ├── Layout (Sidebar, Header)
│   ├── Documents (ISO Document Table with filters, Toolbar, Folder Picker Dialog)
│   ├── Boss (Boss role UI components)
│   ├── AccessDenied (Permission denied UI)
│   ├── PageGuard (Automatic page permission guard)
│   └── Viewers (PDF, DOCX, Watermark)
│
└── Shared
    ├── Auth Context (JWT management)
    ├── API Client (REST calls)
    ├── Hooks (useAbility, useCanAccess, usePages)
    ├── Page Registry (Metadata-based page discovery)
    └── Utils (formatting, helpers, subject validation)
```

### Backend (NestJS 10)

```
apps/api/
├── Modules
│   ├── Auth
│   │   ├── JWT Strategy (access token)
│   │   ├── Local Strategy (username/password)
│   │   └── Guards (JwtAuthGuard, LocalAuthGuard)
│   │
│   ├── Users
│   │   ├── CRUD operations
│   │   └── Role assignment
│   │
│   ├── Department
│   │   ├── CRUD operations
│   │   └── Department listing
│   │
│   ├── KPI
│   │   ├── KPI Record service (by department/year)
│   │   ├── KPI Metric service (monthly values)
│   │   ├── KPI Export service (Excel)
│   │   ├── KPI Attachment service (PDF upload/view/delete)
│   │   │   ├── Auto-folder creation (Department/KPI/current structure)
│   │   │   ├── Optional folderId with backend auto-creation
│   │   │   ├── Race condition handling (unique constraint errors)
│   │   │   └── File deletion with move to "delete files" folder
│   │   ├── Calculation logic (efficiency, averages)
│   │   ├── Year selector support (current year ± 5 years)
│   │   └── Folder management utilities (findOrCreateDepartmentKpiFolder)
│   │
│   ├── Maintenance
│   │   ├── Maintenance notice service
│   │   └── Department filtering
│   │
│   ├── Authorization
│   │   ├── CASL Ability Factory (dynamic permissions)
│   │   ├── Policies Guard (route protection)
│   │   ├── Permission Service (CRUD permissions)
│   │   └── Permission Controller (API endpoints)
│   │
│   └── Storage
│       ├── SMB Service (fs module - platform-aware)
│       ├── Folder Service (CRUD, tree, soft delete, ensure department folder structure on tree load)
│       ├── Folder Sync Service (two-pass sync with soft delete)
│       ├── Folder Watcher Service (chokidar file system watcher)
│       ├── Sync Scheduler Service (automated cron sync)
│       ├── Document Service (CRUD, streaming, counts, metadata)
│       ├── Document Deletion Service (72h window, DCC approval workflow)
│       ├── Version Service (history, restore)
│       ├── Local Edit Service (network paths)
│       ├── Stats Service (dashboard statistics)
│       ├── Checksum Util (SHA-256 calculation)
│       ├── Encoding Util (UTF-8 filename encoding fixes)
│       ├── System User Util (automated operations)
│       └── Gateways
│           └── Folder Sync Gateway (WebSocket real-time updates)
│
└── Common
    ├── Prisma Service (database)
    ├── Decorators (Public, Permissions)
    └── Guards (Rate limiting, Throttling)
```

## Data Flow

### 1. Authentication Flow

```
User → Login Page → POST /auth/login
  → AuthService.validateUser()
  → Username normalized to lowercase (case-insensitive)
  → Argon2 password verification
  → JWT token generation
  → Session stored in DB
  → Token returned to client
  → Stored in localStorage
```

### 2. ISO Document View Flow

```
User → ISO Document page → Select folder → Table shows documents
  → Filters: Status (ACTIVE/ARCHIVED/DELETED), Department
  → Click document in table
  → GET /storage/documents/:id
  → Permission check (RBAC/ABAC)
  → GET /storage/documents/:id/stream
  → SMB Service reads file
  → Stream to client
  → PDF/DOCX viewer renders
  → Copy protection enabled (if no download permission)
```

### 3. Upload Flow

```
User → ISO Documents page → Upload button → Select file
  → Department selector appears (multi-department users) or defaults to user's department (single-department)
  → Folder picker dialog opens (filtered to show only Documents/ISO_documents folder tree)
  → User selects destination folder (must be under ISO_documents)
  → POST /storage/documents/upload?folderId={folderId}
  → Permission check (create)
  → File buffer received
  → Encoding Util fixes UTF-8 filename (fixes mojibake)
  → Version Service creates v1
  → Save to SMB: {folder}/current/{filename}
  → Save version: {folder}/versions/{docId}/v001_...
  → Metadata saved to PostgreSQL
  → Checksum calculated (SHA-256 via ChecksumUtil)
  → deletionExpiresAt set (72 hours from upload)
  → Response with document info
  → Document list refreshes automatically
```

**Note:** When loading folder tree with `departmentId` (`GET /storage/folders/tree?departmentId=...`), backend automatically ensures full department folder structure (root, KPI, ISO_documents, Maintenance, Delete_files, versions) exists if missing, preventing empty tree errors.
<｜tool▁calls▁begin｜><｜tool▁call▁begin｜>
grep

### 4. File System Sync Flow

```
User → "Sync with file system" button
  → POST /storage/folders/sync
  → FolderSyncService.syncWithFileSystem()

  Pass 1: Scan & Update
  → Recursively scan SMB folder tree
  → For each folder:
    → Create if not exists
    → Restore if previously deleted
    → Update parent if moved
  → For each file:
    → Calculate checksum (stream-based)
    → Create document if not exists
    → Update if checksum changed

  Pass 2: Cleanup Orphans
  → Find folders not in file system
    → Soft delete (set deletedAt)
    → Cascade delete children & documents
  → Find documents not in file system
    → Soft delete (set status = DELETED)

  → Return sync completion message
```

### 5. Dashboard Statistics Flow

```
User → Dashboard page
  → GET /storage/stats
  → StatsService.getStats()
  → Parallel queries:
    → DocumentService.count()
    → FolderService.count()
    → UsersService.count()
    → DocumentService.countRecent(7)
  → Return aggregated statistics
```

### 6. Document Deletion Flow

```
User → Delete button → Check deletion status
  → GET /storage/documents/:id/deletion-status
  → DocumentDeletionService.checkDeletionStatus()

  If within 72 hours:
    → User can self-delete
    → DELETE /storage/documents/:id
    → File moved to "delete files" folder
    → Document status = DELETED

  If after 72 hours:
    → Submit deletion request
    → POST /storage/documents/:id/deletion-requests
    → Optional: Upload replacement file
    → Request status = PENDING
    → DCC reviews request
    → POST /storage/deletion-requests/:id/review
    → If approved: File deleted (or replaced)
    → If rejected: Request status = REJECTED
```

### 7. Local Edit Flow

```
User → "Open to Edit" button
  → GET /storage/documents/:id/open-path
  → Permission check (edit)
  → Local Edit Service generates network path
  → Path copied to clipboard
  → User pastes in Windows Explorer
  → File opens in local app (Word/Excel)
  → User edits and saves
  → (Future: File watcher detects change)
  → New version created automatically
```

## Database Schema

### Core Entities

```
User ──┬── UserRole ── Role ── RolePermission ── Permission
       │
       ├── Session (refresh tokens)
       ├── DocumentVersion (created by)
       ├── AuditLog (actions)
       │
       └── FolderPermission / DocumentPermission

Folder ──┬── Folder (self-reference for hierarchy)
        │   └── deletedAt (soft delete)
        │
        ├── Document ──┬── DocumentVersion
        │              │   └── status (ACTIVE/DELETED)
        │              │
        │              └── DocumentPermission
        │
        └── FolderPermission
```

### Key Relationships

- **User ↔ Role**: Many-to-many (UserRole)
- **Role ↔ Permission**: Many-to-many (RolePermission)
- **Folder**: Self-referential (parent-child)
- **Document → Folder**: Many-to-one
- **DocumentVersion → Document**: One-to-many
- **DeletionRequest → Document**: One-to-one (unique constraint)
- **DeletionRequest → User**: Many-to-one (requester, reviewer)
- **DeletionRequest → Document**: Many-to-one (replacement file)
- **Department → KpiRecord**: One-to-many
- **KpiRecord → KpiMetric**: One-to-many
- **FolderPermission**: Folder + Subject (User/Role) + Permission
- **DocumentPermission**: Document + Subject (User/Role) + Permission

## Security Architecture

### Authentication

- **Method**: Username/password (separate system, not AD/LDAP)
- **Username Handling**: Case-insensitive (normalized to lowercase before lookup)
- **Password Hashing**: Argon2id
- **Tokens**: JWT (access: 15min, refresh: 7d)
- **Session Management**: Database-backed (Session table)
- **Rate Limiting**: Throttler (10 req/s, 50 req/10s, 200 req/min)

### Authorization

- **Model**: RBAC + ABAC hybrid (CASL implementation)
- **RBAC Layer**: Roles (admin, boss, manager, editor, viewer)
- **ABAC Layer**: Folder/Document/Page-level permissions
- **Subjects**: Document, Folder, User, Department, Kpi, Maintenance, Permission, "all"
- **Inheritance**: Folder permissions apply to subfolders and documents (via `inherit` flag)
- **Override**: Document permissions override folder permissions
- **Boss Role**: Read-only access (view, download, print) to all resources
- **Implementation**: CASL MongoAbility with dynamic ability factory
- **Backend Enforcement**: PoliciesGuard with CheckPolicies decorator
- **Frontend Enforcement**:
  - `useCanAccess` hook with route-level checks
  - `PageGuard` component for automatic permission checks from page metadata
- **Navigation Filtering**: Sidebar items filtered based on permissions
- **Page Protection**: All dashboard pages protected by permission checks
- **Page Registry System**: Metadata-based page discovery and auto-registration
  - Pages export metadata (path, module, action, icon, order)
  - Page registry collects all page metadata
  - Dynamic sidebar generation from registry
  - Subject validation for type-safe permission checks

### Data Protection

- **Copy Protection**: Disable right-click, Ctrl+C/P, text selection
- **Watermarking**: User email + timestamp on sensitive documents
- **File Integrity**: SHA-256 checksums for all versions
- **Audit Logging**: All actions logged (view, download, edit, etc.)

## Storage Architecture

### SMB Folder Structure

```
\\192.168.1.x\SharedFolder\
├── {department}/
│   ├── Tài liệu ISO/
│   │   ├── current/
│   │   │   └── document.pdf
│   │   └── versions/
│   │       └── {documentId}/
│   │           ├── v001_20241218_103000_userId.pdf
│   │           └── v002_20241218_153000_userId.pdf
│   │
│   ├── KPI/
│   │   └── current/
│   │       └── kpi-attachment.pdf
│   │
│   ├── maintenance/
│   │
│   ├── documents/
│   │
│   └── delete files/          # Files moved here when deleted
│       └── deleted-file.pdf
│
└── ...
```

### File Naming Convention

- **Current**: `{folder}/current/{originalFilename}`
- **Version**: `v{version}_{YYYYMMDD}_{HHmmss}_{userId}.{ext}`
- Example: `v001_20241218_103000_a1b2c3d4.pdf`

## Deployment Architecture

### Development

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Next.js   │     │   NestJS    │     │  PostgreSQL  │
│  (Port 3000)│────▶│  (Port 3001)│────▶│  (Port 5432) │
└─────────────┘     └─────────────┘     └─────────────┘
```

### Production (Docker)

```
┌─────────────────────────────────────────────────────┐
│              Docker Compose Stack                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │   Web    │  │   API    │  │ Postgres  │        │
│  │ Container│  │Container │  │ Container│        │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘        │
└───────┼─────────────┼──────────────┼───────────────┘
        │             │              │
        └─────────────┴──────────────┘
                      │
        ┌─────────────▼─────────────┐
        │    SMB Shared Folder       │
        │  (Network Mount/Volume)    │
        └───────────────────────────┘
```

### CI/CD (GitHub Actions)

- **Platform**: GitHub Actions (repository: `Puh1001/DocumentManager`)
- **Build & Test**:
  - `ci.yml`: Lint, type-check, test (API/Web), build artifacts
  - PostgreSQL service được dùng cho API tests
- **Container Images**:
  - `docker.yml`: Build multi-arch images từ `apps/api` và `apps/web` và push lên GitHub Container Registry (GHCR)
- **Security**:
  - `security.yml`: Dependency review (CodeQL disabled cho private repo; enable khi public/GHAS)
- **Deploy**:
  - `deploy.yml`: Trigger script deploy staging/production (thường dùng để chạy `docker-compose.prod.yml` trên server)

## Scalability Considerations

### Current Implementation

- **Database**: PostgreSQL with indexes on frequently queried fields
- **Caching**: Redis for rate limiting and session management
- **File Streaming**: Chunked streaming for large files
- **Rate Limiting**: Multi-tier throttling (short/medium/long)

### Future Optimizations

- **CDN**: Static assets and document previews
- **Load Balancing**: Multiple API instances
- **Database Replication**: Read replicas for reporting
- **File Caching**: Cache frequently accessed documents
- **Background Jobs**: Async version creation, file scanning

## Technology Stack

| Layer    | Technology   | Version  | Purpose                         |
| -------- | ------------ | -------- | ------------------------------- |
| Frontend | Next.js      | 14.0.4   | React framework with App Router |
| Frontend | Tailwind CSS | 3.4.0    | Utility-first CSS               |
| Frontend | ShadcnUI     | Latest   | Component library               |
| Frontend | next-intl    | Latest   | Internationalization            |
| Frontend | Chart.js     | Latest   | Chart visualization             |
| Backend  | NestJS       | 10.3.0   | Node.js framework               |
| Backend  | Prisma       | 5.7.1    | ORM for PostgreSQL              |
| Database | PostgreSQL   | 16       | Relational database             |
| Cache    | Redis        | 7        | Rate limiting, sessions         |
| Auth     | Passport     | 0.7.0    | Authentication middleware       |
| Auth     | JWT          | 10.2.0   | Token-based auth                |
| Auth     | CASL         | Latest   | Authorization (RBAC + ABAC)     |
| Storage  | Node.js fs   | Built-in | SMB file access                 |
| Viewer   | mammoth.js   | Latest   | DOCX to HTML                    |
| Export   | ExcelJS      | Latest   | Excel export (KPI)              |
| Monorepo | Turborepo    | 2.3.3    | Build system                    |

## API Architecture

### RESTful Design

```
/api
├── /auth
│   ├── POST   /login
│   ├── POST   /logout
│   ├── POST   /refresh
│   └── GET    /me
│
├── /users
│   ├── GET    /          # List (paginated)
│   ├── GET    /:id       # Get one
│   ├── POST   /          # Create
│   ├── PATCH  /:id       # Update
│   └── DELETE /:id       # Deactivate
│
├── /departments
│   ├── GET    /          # List all
│   ├── GET    /:id       # Get one
│   ├── POST   /          # Create (admin)
│   ├── PATCH  /:id       # Update (admin)
│   └── DELETE /:id       # Delete (admin)
│
├── /kpi
│   ├── /records
│   │   ├── GET    /          # List (query: departmentId, year)
│   │   │                        # Year selector: current year ± 5 years
│   │   ├── GET    /:id       # Get with metrics
│   │   ├── POST   /          # Create (with year field)
│   │   ├── PATCH  /:id       # Update
│   │   ├── DELETE /:id       # Delete
│   │   ├── GET    /:id/export # Export to Excel
│   │   ├── POST   /:id/attachments # Upload PDF (body: month 1–12 optional; folderId optional, auto-creates folder)
│   │   └── GET    /:id/attachments # List attachments (query ?month=1…12 optional; legacy NULL month included)
│   ├── /attachments
│   │   ├── GET    /:id/stream     # Stream PDF for viewer
│   │   ├── GET    /:id/download   # Download PDF
│   │   └── DELETE /:id            # Delete (moves to "delete files" folder)
│   └── /metrics
│       ├── POST   /          # Add metric
│       ├── PATCH  /:id       # Update metric
│       └── DELETE /:id       # Delete metric
│
├── /permissions
│   ├── GET    /                    # List all permissions (manage: all)
│   ├── GET    /roles/:id           # Get role permissions
│   ├── POST   /roles/:id           # Assign permissions to role
│   ├── GET    /folders/:id         # Get folder permissions
│   ├── POST   /folders/:id         # Set folder permissions
│   ├── GET    /documents/:id       # Get document permissions
│   └── POST   /documents/:id       # Set document permissions
│
└── /storage
    ├── /folders
    │   ├── GET    /          # List
    │   ├── GET    /tree       # Tree structure (query: ?departmentId=)
    │   ├── GET    /:id        # Get with contents (query: ?status=ACTIVE|ARCHIVED|DELETED; includes _count.versions; invalid values ignored)
    │   ├── POST   /          # Create
    │   ├── PATCH  /:id       # Update
    │   ├── DELETE /:id       # Delete
    │   └── POST   /sync      # Sync with file system
    │
    ├── /stats
    │   └── GET    /          # Dashboard statistics
    │
    └── /documents
        ├── GET    /                 # List all documents (query: ?status=ACTIVE|ARCHIVED|DELETED&departmentId=&level=)
        ├── GET    /:id              # Get info
        ├── GET    /:id/stream       # Stream for viewer
        ├── GET    /:id/download     # Download file
        ├── POST   /upload           # Upload new (body: folderId)
        ├── POST   /:id/upload-version # Upload version
        ├── GET    /:id/versions     # Version history
        └── GET    /:id/open-path    # Local edit path
```

## Error Handling

### Backend

- **Validation**: class-validator DTOs
- **Exceptions**: NestJS exception filters
- **Logging**: Structured logging with context
- **Audit**: All errors logged to AuditLog

### Frontend

- **API Errors**: Centralized error handling in API client
- **User Feedback**: Toast notifications for errors
- **Retry Logic**: Automatic retry for transient failures
- **Offline Handling**: (Future: Service worker)

## Monitoring & Observability

### Current

- **Health Check**: `/api/health` endpoint
- **Audit Logs**: All actions logged to database
- **Error Logging**: Console + (Future: centralized logging)

### Future

- **Metrics**: Response times, error rates
- **Tracing**: Request tracing across services
- **Alerts**: Critical error notifications
- **Dashboards**: System health visualization

# System Architecture

**Last Updated:** 2024-12-19  
**Status:** Phase 1-3 In Progress (40%)

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
│   ├── /login              # Public login page
│   └── /dashboard          # Protected routes
│       ├── /documents      # Document browser
│       └── /documents/[id]/view  # Document viewer
│
├── Client Components
│   ├── Layout (Sidebar, Header)
│   ├── Documents (Tree, List, Toolbar)
│   └── Viewers (PDF, DOCX, Watermark)
│
└── Shared
    ├── Auth Context (JWT management)
    ├── API Client (REST calls)
    └── Utils (formatting, helpers)
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
│   └── Storage
│       ├── SMB Service (fs module - platform-aware)
│       ├── Folder Service (CRUD, tree, soft delete)
│       ├── Folder Sync Service (two-pass sync with soft delete)
│       ├── Document Service (CRUD, streaming, counts)
│       ├── Version Service (history, restore)
│       ├── Local Edit Service (network paths)
│       ├── Stats Service (dashboard statistics)
│       ├── Checksum Util (SHA-256 calculation)
│       └── System User Util (automated operations)
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
  → Argon2 password verification
  → JWT token generation
  → Session stored in DB
  → Token returned to client
  → Stored in localStorage
```

### 2. Document View Flow

```
User → Document List → Click document
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
User → Upload button → Select file
  → POST /storage/documents/upload
  → Permission check (create)
  → File buffer received
  → Version Service creates v1
  → Save to SMB: {folder}/current/{filename}
  → Save version: {folder}/versions/{docId}/v001_...
  → Metadata saved to PostgreSQL
  → Checksum calculated (SHA-256 via ChecksumUtil)
  → Response with document info
```

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

### 6. Local Edit Flow

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
- **FolderPermission**: Folder + Subject (User/Role) + Permission
- **DocumentPermission**: Document + Subject (User/Role) + Permission

## Security Architecture

### Authentication

- **Method**: Username/password (separate system, not AD/LDAP)
- **Password Hashing**: Argon2id
- **Tokens**: JWT (access: 15min, refresh: 7d)
- **Session Management**: Database-backed (Session table)
- **Rate Limiting**: Throttler (10 req/s, 50 req/10s, 200 req/min)

### Authorization

- **Model**: RBAC + ABAC hybrid
- **RBAC Layer**: Roles (admin, manager, editor, viewer)
- **ABAC Layer**: Folder/Document-level permissions
- **Inheritance**: Folder permissions apply to subfolders and documents
- **Override**: Document permissions override folder permissions

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
│   └── Bảo trì thiết bị/
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
| Backend  | NestJS       | 10.3.0   | Node.js framework               |
| Backend  | Prisma       | 5.7.1    | ORM for PostgreSQL              |
| Database | PostgreSQL   | 16       | Relational database             |
| Cache    | Redis        | 7        | Rate limiting, sessions         |
| Auth     | Passport     | 0.7.0    | Authentication middleware       |
| Auth     | JWT          | 10.2.0   | Token-based auth                |
| Storage  | Node.js fs   | Built-in | SMB file access                 |
| Viewer   | mammoth.js   | Latest   | DOCX to HTML                    |
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
└── /storage
    ├── /folders
    │   ├── GET    /          # List
    │   ├── GET    /tree       # Tree structure
    │   ├── GET    /:id        # Get with contents
    │   ├── POST   /          # Create
    │   ├── PATCH  /:id       # Update
    │   ├── DELETE /:id       # Delete
    │   └── POST   /sync      # Sync with file system
    │
    ├── /stats
    │   └── GET    /          # Dashboard statistics
    │
    └── /documents
        ├── GET    /:id              # Get info
        ├── GET    /:id/stream       # Stream for viewer
        ├── GET    /:id/download     # Download file
        ├── POST   /upload           # Upload new
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

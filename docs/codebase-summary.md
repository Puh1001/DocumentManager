# Codebase Summary

## Project Overview

ISO Document Management System - A "Librarian Model" web application for managing ISO documents with local network storage integration.

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Next.js Web   │────▶│   NestJS API    │────▶│  SMB Shared     │
│   (Frontend)    │     │   (Backend)     │     │  Folder         │
└─────────────────┘     └────────┬────────┘     └─────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │     PostgreSQL      │
                    │   (Metadata & Auth) │
                    └─────────────────────┘
```

## Directory Structure

### `/apps/api` - NestJS Backend

```
src/
├── main.ts                 # Application entry point
├── app.module.ts           # Root module
├── health.controller.ts    # Health check endpoint
├── common/
│   ├── prisma/            # Database service
│   └── decorators/        # Custom decorators
└── modules/
    ├── auth/              # Authentication (JWT, Passport)
    ├── users/             # User management
    ├── department/        # Department management
    ├── kpi/               # KPI tracking and metrics
    │   ├── controllers/
    │   │   ├── kpi-record.controller.ts
    │   │   ├── kpi-metric.controller.ts
    │   │   ├── kpi-export.controller.ts
    │   │   └── kpi-attachment.controller.ts  # PDF attachments
    │   ├── services/
    │   │   ├── kpi-record.service.ts
    │   │   ├── kpi-metric.service.ts
    │   │   ├── kpi-export.service.ts
    │   │   └── kpi-attachment.service.ts     # PDF attachment management
    │   └── dto/
    │       └── create-kpi-attachment.dto.ts
    ├── maintenance/       # Maintenance notices
    ├── authorization/     # RBAC + ABAC permissions (CASL)
    │   ├── factories/     # CASL ability factory
    │   ├── guards/        # Policies guard
    │   ├── services/      # Permission service
    │   ├── controllers/   # Permission API
    │   └── decorators/     # CheckPolicies decorator
    └── storage/           # File/folder management
        ├── controllers/
        │   ├── folder.controller.ts
        │   ├── document.controller.ts
        │   └── stats.controller.ts
        ├── services/
        │   ├── smb.service.ts        # Platform-aware file system access
        │   ├── folder.service.ts     # Folder CRUD & tree
        │   ├── folder-sync.service.ts # Two-pass file system sync
        │   ├── document.service.ts   # Document CRUD
        │   ├── document-deletion.service.ts # Deletion workflow (72h window, DCC approval)
        │   ├── version.service.ts    # Version control
        │   ├── local-edit.service.ts # Local app integration
        │   └── stats.service.ts      # Dashboard statistics
        ├── controllers/
        │   ├── deletion-request.controller.ts # Deletion request API
        │   └── ...
        ├── utils/
        │   ├── checksum.util.ts      # SHA-256 checksum calculation
        │   ├── system-user.util.ts   # System user management
        │   └── encoding.util.ts      # UTF-8 filename encoding fixes
        └── dto/
```

### `/apps/web` - Next.js Frontend

```
src/
├── app/
│   ├── [locale]/          # Internationalization routes
│   │   ├── layout.tsx     # Root layout
│   │   ├── page.tsx       # Home (redirect)
│   │   ├── login/         # Login page
│   │   └── dashboard/
│   │       ├── layout.tsx     # Dashboard layout
│   │       ├── page.tsx      # Dashboard home
│   │       ├── documents/    # ISO Document browser
│   │       ├── departments/  # Department management
│   │       ├── kpi/          # KPI tracking
│   │       └── maintenance/  # Maintenance notices
├── components/
│   ├── ui/                # ShadcnUI components
│   ├── layout/            # Sidebar, Header
│   ├── documents/         # ISO Document components (table, filters, toolbar)
│   │   ├── deletion-actions.tsx        # Deletion action buttons
│   │   └── deletion-request-dialog.tsx # Deletion request form
│   ├── boss/              # Boss role components
│   │   ├── kpi-attachment-upload.tsx    # KPI PDF upload
│   │   ├── kpi-attachment-list.tsx      # KPI attachment list
│   │   └── kpi-attachment-viewer.tsx    # KPI PDF viewer
│   ├── access-denied.tsx  # Access denied component
│   ├── page-guard.tsx     # Automatic page permission guard
│   └── viewers/           # PDF/DOCX viewers
├── hooks/
│   ├── use-ability.ts           # CASL ability hook
│   ├── use-can-access.ts         # Permission check hook
│   ├── use-pages.ts              # Page registry hook
│   ├── use-copy-protection.ts
│   └── use-maintenance-notices.ts
├── lib/
│   ├── page-registry.ts         # Page metadata registry
│   ├── page-registry-init.ts     # Page registration initialization
│   └── utils/
│       └── subject-validation.ts  # Subject name validation
└── lib/
    ├── auth-context.tsx   # Auth state
    ├── api.ts             # API client
    └── utils.ts           # Utilities
```

### `/packages/shared` - Shared Code

```
src/
├── types/       # TypeScript interfaces
├── constants/   # Shared constants
└── utils/       # Shared utilities
```

### `.github/workflows` - CI/CD

```
.github/workflows/
├── ci.yml        # Lint, type-check, test, build
├── docker.yml    # Docker build & push to GHCR
├── security.yml  # CodeQL + dependency review
├── deploy.yml    # Staging & production deploy hooks
└── README.md     # CI/CD documentation
```

## Key Features

### 1. Authentication

- Username/password login
- **Case-insensitive username login** (V210889, v210889, etc.)
- JWT access token (15min) + refresh token (7d)
- Session management in database
- Rate limiting

### 2. File Management

- SMB shared folder integration
- Folder tree navigation
- Document upload/download with **progress tracking**
- File streaming for viewer
- **Two-pass file system sync**:
  - Pass 1: Scan & update (create/update folders & documents)
  - Pass 2: Cleanup orphans (soft delete missing files/folders)
- **Soft delete** for folders (preserves history)
- **Checksum verification** (SHA-256) for file integrity
- **Enhanced metadata extraction** (file dates, MIME type)
- **Real-time sync** (WebSocket + file watcher)
- **Automated sync scheduling** (cron jobs)
- **Dashboard statistics** (total documents, folders, users, recent uploads)
- **ISO Document table view**: Flat list (no folder tree sidebar)
  - **Table columns**: No., Title (from Document.name/fileName), Version (from DocumentVersion count), Level (placeholder), Responsible Department (from Document.folder.department), Preparer/Reviewer/Approver (placeholders), Approval Date/Receipt Date (placeholders), Storage Location (from Document.folder.path), Status (from Document.status), uploadPDF (view link), Actions
  - **Filters**: Status (ACTIVE/ARCHIVED/DELETED), Department, Level (placeholder for future schema extension)
  - **API**: `GET /storage/documents?status=ACTIVE&departmentId=dept-1&level=LEVEL1` - Returns all documents with folder info
  - **Upload**: Folder picker dialog for selecting destination folder
  - **Department folder auto-creation**: When loading folder tree with `departmentId` parameter (`GET /storage/folders/tree?departmentId=...`), backend automatically ensures full department folder structure exists (root, KPI, ISO_documents, Maintenance, Delete_files, versions) if missing, preventing "Không có thư mục nào" errors
  - **Upload allowed sections**: Backend allows upload only to **Documents** (ISO_documents) or **KPI** folder (defence in depth). From ISO documents page, uploads go to the selected department’s ISO_documents folder; from KPI page, uploads go to the department’s KPI folder. Folder picker on documents page shows only the Documents folder tree; document list/browse remains unchanged (shows documents from all folders)

### 2.5. Department Management

- Department CRUD operations
- Department listing and filtering
- Integration with KPI and maintenance notices
- Department-based access control

### 2.6. KPI Tracking

- KPI record management (by department and year)
- **Year selector dropdown** (current year ± 5 years, default: current year)
- KPI metric tracking (monthly values)
- Auto-calculation of efficiency and averages
- Chart visualization (Chart.js)
- Excel export functionality
- Support for historical and future year data entry (e.g., 2025)
- **PDF Attachments**: Upload, view, and delete PDF files for KPI records (month-scoped)
  - **Monthly uploads**: Month selector next to year; list filtered by `?month=1`…`12`; upload accepts `month` (1–12, default current month); legacy attachments (NULL month) shown for all months
  - Upload component with permission checks
  - **Auto-folder creation**: Backend automatically creates `Department/KPI/current` folder structure if not exists
  - **Optional folderId**: `folderId` parameter is optional; backend handles auto-creation when omitted
  - **Race condition handling**: Robust folder creation with unique constraint error handling (P2002)
  - Attachment list with delete functionality
  - PDF viewer modal with download/print support
  - File deletion moves files to "delete files" folder in department

### 2.7. Maintenance Notices

- Maintenance notice creation and management
- Department-specific notices
- Dashboard integration (upcoming notices)
- Local storage persistence (demo mode)

### 3. Version Control

- Automatic versioning on upload
- Version naming: `v001_YYYYMMDD_HHmmss_userId.ext`
- Version history with user tracking
- Restore previous versions

### 4. Permissions (RBAC + ABAC) ✅

- Roles: admin, boss, manager, editor, viewer
- Actions: view, download, print, edit, create, delete, manage
- Subjects: Document, Folder, User, Department, Kpi, Maintenance, Permission, "all"
- Folder-level permissions with inheritance
- Document-level permissions (override folder)
- Page-level permissions (control access to dashboard pages)
- CASL-based authorization system (MongoAbility)
- Policy-based access control via PoliciesGuard (backend)
- Frontend route protection via `useCanAccess` hook
- Sidebar navigation filtering based on permissions
- Boss role: Read-only access to all resources
- Permission management API endpoints (backend)
- Permission management UI (frontend)
- Ability factory for dynamic permission loading

### 5. Document Viewer

- PDF viewer (iframe-based)
- DOCX viewer (mammoth.js conversion)
- Copy protection (disable right-click, Ctrl+C)
- Watermarking for unauthorized downloads

### 6. Local Edit Integration

- "Open to Edit" button
- Generate network path for clipboard
- Instructions for Windows Explorer

### 7. Internationalization (i18n)

- Multi-language support (English, Vietnamese, Chinese)
- next-intl integration
- Locale-based routing
- Translation files for all features

## Database Schema

### Core Models

- **User**: User accounts with departments
- **Role**: Permission roles
- **Session**: JWT refresh tokens
- **Folder**: Folder hierarchy with physical location
  - **Soft delete**: `deletedAt` field for history preservation
- **Document**: Document metadata
  - **Status**: ACTIVE, DELETED (soft delete)
  - **deletionExpiresAt**: Timestamp for 72-hour deletion window
- **DocumentVersion**: Version history
- **DeletionRequest**: Deletion request workflow
  - **Status**: PENDING, APPROVED, REJECTED
  - **replacementFileId**: Optional replacement file
- **Department**: Department information
- **KpiRecord**: KPI records by department and year
- **KpiMetric**: KPI metric values (monthly)
- **KpiAttachment**: PDF attachments linked to KPI records
- **Permission**: Action definitions
- **FolderPermission**: Folder-level access
- **DocumentPermission**: Document-level access
- **AuditLog**: Action history

## Configuration

### Environment Variables

```env
# Database
DATABASE_URL=postgresql://...

# JWT
JWT_SECRET=...
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d

# SMB (Development - Windows)
SMB_SERVER=10.0.60.30
SMB_SHARE=Public
SMB_BASE_PATH=IT-Information Technology Dept\devTest
SMB_USE_MOUNTED_DRIVE=false

# SMB (Production - Linux)
SMB_MOUNT_PATH=/shared
```

## Running the Project

```bash
# Development
npm install
docker-compose up -d postgres
npm run db:push
npm run dev

# Production
docker-compose -f docker-compose.prod.yml up -d
```

## CI/CD Pipelines

- **Platform**: GitHub Actions
- **Workflows**:
  - `ci.yml`: Lint, type-check, test (API/Web), build
  - `docker.yml`: Build & push Docker images lên GitHub Container Registry
  - `security.yml`: Dependency review (CodeQL disabled for private repo; enable when public/GHAS)
  - `deploy.yml`: Trigger deploy scripts cho staging / production
  - Documentation: `.github/workflows/README.md`

## Recent Updates

### Latest Updates (2026-01-30)

- **Monthly KPI uploads**: Attachments are month-scoped; list accepts `?month=1`…`12`; upload accepts `month` (1–12, default current month); month selector next to year on KPI page; legacy attachments (NULL month) shown for all months.

### Previous Updates (2026-01-26)

- **Document Deletion Workflow**: Complete implementation of 72-hour self-deletion window and DCC approval workflow
  - Users can delete their own documents within 72 hours of upload
  - After 72 hours, deletion requests require DCC approval
  - Support for replacement files in deletion requests
  - File deletion moves to "delete files" folder (soft delete)
- **UTF-8 Filename Encoding Fixes**: Fixed mojibake issues for Vietnamese, Chinese, and other Unicode filenames
  - Encoding utility (`encoding.util.ts`) converts Latin1-misdecoded filenames back to UTF-8
  - Applied to document uploads and KPI attachments
  - Normalizes filenames to NFC for database compatibility
- **KPI Attachment Auto-Folder Creation**: Backend automatically creates `Department/KPI/current` folder structure when `folderId` is not provided during upload
- **Optional folderId Parameter**: `folderId` is now optional in KPI attachment upload DTO; backend handles auto-creation with race condition protection
- **Robust Folder Management**: Improved folder creation logic with unique constraint error handling (P2002) to prevent race conditions
- **Translation Support**: Added missing translation keys (common.cancel, common.save, common.saving) for all locales (en, vi, zh)

### New Features (2024-2025)

- **Department Management Module**: Full CRUD operations for departments
- **KPI Tracking Module**: Track KPIs by department with monthly metrics, charts, and Excel export
  - **Year selector**: Users can select year (current ± 5 years) to view/edit KPI data
  - Support for historical and future year data entry (e.g., 2025)
- **Maintenance Notices**: Create and manage maintenance notices with department filtering
- **Internationalization**: Multi-language support with next-intl (English, Vietnamese, Chinese)
- **Enhanced Dashboard**: Statistics cards, upcoming maintenance notices, activity tracking
- **Authentication Enhancements**:
  - **Case-insensitive username login**: Users can login with any case combination (V210889, v210889, etc.)
  - Username normalized to lowercase before database lookup
- **User Management**:
  - **Admin Dept Users Migration**: Migration script for 50 users with admin_dept role
  - Department code mapping from users.txt to existing database codes
  - Default password management for migrated users
- **Authorization Module**: Complete RBAC + ABAC implementation with CASL
  - Permission management API (role, folder, document permissions)
  - CASL ability factory for dynamic permission evaluation
  - PoliciesGuard for route-level permission enforcement (backend)
  - Frontend route protection with `useCanAccess` hook
  - Permission management UI (role, permission CRUD)
  - Sidebar navigation filtering based on permissions
  - Page-level permissions (User, Department, KPI, Maintenance, Permission)
  - Boss role with read-only access to all resources
  - Permission inheritance for folders
- **Page Registry System**: Metadata-based page discovery
  - Page metadata type system for auto-discovery
  - Page registry for collecting page metadata
  - PageGuard component for automatic permission checks
  - Subject validation utilities
  - Dynamic sidebar generation from page registry
- **KPI PDF Attachments** (2026-01-10, updated 2026-01-12):
  - Upload PDF files to KPI records with permission checks
  - **Auto-folder creation**: Backend automatically creates department KPI folder structure (`Department/KPI/current`) when `folderId` is not provided
  - **Optional folderId**: DTO accepts optional `folderId`; backend handles auto-creation with race condition protection
  - View PDF attachments in modal viewer
  - Delete attachments (moves file to "delete files" folder)
  - UI components with variant support (default/cyber styling)
  - File deletion moves files to department "delete files" folder instead of hard deletion
  - Translation support for common actions (cancel, save, saving)

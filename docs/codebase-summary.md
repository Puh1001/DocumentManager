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
        │   ├── version.service.ts    # Version control
        │   ├── local-edit.service.ts # Local app integration
        │   └── stats.service.ts      # Dashboard statistics
        ├── utils/
        │   ├── checksum.util.ts      # SHA-256 checksum calculation
        │   └── system-user.util.ts   # System user management
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
│   │       ├── documents/    # Document browser
│   │       ├── departments/  # Department management
│   │       ├── kpi/          # KPI tracking
│   │       └── maintenance/  # Maintenance notices
├── components/
│   ├── ui/                # ShadcnUI components
│   ├── layout/            # Sidebar, Header
│   ├── documents/         # Document components
│   ├── boss/              # Boss role components
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

### 2.5. Department Management

- Department CRUD operations
- Department listing and filtering
- Integration with KPI and maintenance notices
- Department-based access control

### 2.6. KPI Tracking

- KPI record management (by department and year)
- KPI metric tracking (monthly values)
- Auto-calculation of efficiency and averages
- Chart visualization (Chart.js)
- Excel export functionality

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
- **DocumentVersion**: Version history
- **Department**: Department information
- **KpiRecord**: KPI records by department and year
- **KpiMetric**: KPI metric values (monthly)
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

### New Features (2024-2025)

- **Department Management Module**: Full CRUD operations for departments
- **KPI Tracking Module**: Track KPIs by department with monthly metrics, charts, and Excel export
- **Maintenance Notices**: Create and manage maintenance notices with department filtering
- **Internationalization**: Multi-language support with next-intl (English, Vietnamese, Chinese)
- **Enhanced Dashboard**: Statistics cards, upcoming maintenance notices, activity tracking
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

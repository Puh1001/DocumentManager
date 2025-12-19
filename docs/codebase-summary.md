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
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home (redirect)
│   ├── login/             # Login page
│   └── dashboard/
│       ├── layout.tsx     # Dashboard layout
│       ├── page.tsx       # Dashboard home
│       └── documents/
│           ├── page.tsx   # Document browser
│           └── [id]/view/ # Document viewer
├── components/
│   ├── ui/                # ShadcnUI components
│   ├── layout/            # Sidebar, Header
│   ├── documents/         # Document components
│   └── viewers/           # PDF/DOCX viewers
├── hooks/
│   └── use-copy-protection.ts
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
- Document upload/download
- File streaming for viewer
- **Two-pass file system sync**:
  - Pass 1: Scan & update (create/update folders & documents)
  - Pass 2: Cleanup orphans (soft delete missing files/folders)
- **Soft delete** for folders (preserves history)
- **Checksum verification** (SHA-256) for file integrity
- **Dashboard statistics** (total documents, folders, users, recent uploads)

### 3. Version Control

- Automatic versioning on upload
- Version naming: `v001_YYYYMMDD_HHmmss_userId.ext`
- Version history with user tracking
- Restore previous versions

### 4. Permissions (RBAC + ABAC)

- Roles: admin, manager, editor, viewer
- Actions: view, download, print, edit, create, delete, manage
- Folder-level permissions with inheritance
- Document-level permissions (override folder)

### 5. Document Viewer

- PDF viewer (iframe-based)
- DOCX viewer (mammoth.js conversion)
- Copy protection (disable right-click, Ctrl+C)
- Watermarking for unauthorized downloads

### 6. Local Edit Integration

- "Open to Edit" button
- Generate network path for clipboard
- Instructions for Windows Explorer

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
  - `security.yml`: CodeQL + dependency review
  - `deploy.yml`: Trigger deploy scripts cho staging / production
  - Documentation: `.github/workflows/README.md`

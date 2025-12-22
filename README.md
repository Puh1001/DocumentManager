# ISO Document Manager

Hệ thống Quản lý Tài liệu ISO theo mô hình "Thủ thư" (Librarian Model).

## 🎯 Tổng quan

Web application quản lý metadata và phân quyền, trong khi lưu trữ và chỉnh sửa file diễn ra trực tiếp trên shared folder (Local Network Storage).

### Tính năng chính

- 📁 **Quản lý File & Folder**: Browse, upload, download tài liệu từ SMB shared folder
- 🔄 **File System Sync**: Two-pass sync với soft delete để đồng bộ database với file system
- 📊 **Dashboard Statistics**: Thống kê tổng quan (documents, folders, users, recent uploads)
- 🔒 **Phân quyền RBAC + ABAC**: Role-based + Attribute-based access control
- 📄 **Document Viewer**: Xem PDF/DOCX trực tiếp trên web với copy protection
- 📝 **Version Control**: Theo dõi lịch sử thay đổi, restore phiên bản cũ
- 🖥️ **Local Edit**: Mở file trực tiếp trong ứng dụng local (Word, Excel)
- 📍 **Physical Location**: Quản lý vị trí lưu trữ bản cứng

## 🛠️ Tech Stack

| Layer      | Technology                                  |
| ---------- | ------------------------------------------- |
| Frontend   | Next.js 14 (App Router), Tailwind, ShadcnUI |
| Backend    | NestJS 10, REST API                         |
| Database   | PostgreSQL 16 + Prisma                      |
| Auth       | JWT + Passport                              |
| Storage    | SMB/CIFS (fs module - platform-aware)       |
| Permission | CASL (ABAC + RBAC)                          |

### CI/CD & Repository

- **Repository**: `https://github.com/Puh1001/DocumentManager`
- **CI/CD**: GitHub Actions
  - CI workflow: lint, type-check, test (API/Web), build
  - Docker workflow: build & push images lên GitHub Container Registry (GHCR)
  - Security workflow: Dependency Review (CodeQL disabled for private repo; enable when public/GHAS)
  - Deploy workflow: staging & production (manual / tag `v*`)
  - Chi tiết: xem `.github/workflows/README.md`

## 📁 Project Structure

```
documentsManager/
├── apps/
│   ├── web/          # Next.js Frontend
│   └── api/          # NestJS Backend
├── packages/
│   └── shared/       # Shared types & utilities
├── prisma/           # Database schema
├── docs/             # Documentation
└── plans/            # Implementation plans
```

## 🚀 Getting Started

Xem [Quick Start Guide](./docs/quick-start.md) để biết chi tiết.

### Environment Variables

Tạo file `.env` trong `apps/api/` với các biến sau:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/iso_docs?schema=public"

# JWT
JWT_SECRET="your-secret-key"
JWT_EXPIRES_IN="7d"

# SMB Configuration
SMB_SERVER=10.0.60.30
SMB_SHARE=Public
SMB_BASE_PATH=IT-Information Technology Dept\devTest
SMB_DOMAIN=bestpacific.com
SMB_USERNAME=your-username
SMB_PASSWORD=your-password
```

### Quick Commands

```bash
# Install dependencies
npm install

# Start database
docker-compose up -d postgres redis

# Setup database
npm run db:generate
npm run db:push
cd apps/api && npx ts-node prisma/seed.ts && cd ../..

# Start development
npm run dev

# Build production
npm run build

# Lint code
npm run lint
```

**Access Points:**

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- API Docs: http://localhost:3001/api/docs

### Production Deployment

See [Deployment Guide](./docs/deployment-guide.md) for detailed instructions.

```bash
# Build and run with Docker
docker-compose -f docker-compose.prod.yml up -d

# Run database migrations
docker-compose -f docker-compose.prod.yml exec api npx prisma migrate deploy
```

## 🔑 Default Credentials

| Username | Password | Role  |
| -------- | -------- | ----- |
| admin    | admin123 | Admin |

## 📖 API Endpoints

### Auth

| Method | Endpoint      | Description   |
| ------ | ------------- | ------------- |
| POST   | /auth/login   | Login         |
| POST   | /auth/logout  | Logout        |
| POST   | /auth/refresh | Refresh token |
| GET    | /auth/me      | Current user  |

### Storage

| Method | Endpoint                        | Description           |
| ------ | ------------------------------- | --------------------- |
| GET    | /storage/folders                | List folders          |
| GET    | /storage/folders/tree           | Folder tree           |
| GET    | /storage/folders/:id            | Folder contents       |
| POST   | /storage/folders                | Create folder         |
| PATCH  | /storage/folders/:id            | Update folder         |
| DELETE | /storage/folders/:id            | Delete folder         |
| POST   | /storage/folders/sync           | Sync with file system |
| GET    | /storage/stats                  | Dashboard statistics  |
| POST   | /storage/documents/upload       | Upload document       |
| GET    | /storage/documents/:id          | Document info         |
| GET    | /storage/documents/:id/stream   | Stream for viewer     |
| GET    | /storage/documents/:id/versions | Version history       |

### Users

| Method | Endpoint   | Description |
| ------ | ---------- | ----------- |
| GET    | /users     | List users  |
| POST   | /users     | Create user |
| PATCH  | /users/:id | Update user |
| DELETE | /users/:id | Deactivate  |

## 🔒 Permission Model

### Roles

- **Admin**: Full system access
- **Manager**: CRUD on assigned folders
- **Editor**: Create/edit documents
- **Viewer**: View only

### Actions

| Action   | Description                   |
| -------- | ----------------------------- |
| view     | View document content         |
| download | Download file                 |
| print    | Print document                |
| edit     | Open in local app for editing |
| create   | Create new documents          |
| delete   | Delete documents              |
| manage   | Manage permissions            |

## 🛡️ Security Features

- JWT authentication with refresh tokens
- Password hashing with Argon2
- Rate limiting
- Copy protection (disable right-click, shortcuts)
- Watermarking for sensitive documents
- Audit logging for all actions

## 📚 Documentation

- [Project Overview](./docs/project-overview-pdr.md) - Product requirements
- [System Architecture](./docs/system-architecture.md) - Technical architecture
- [Codebase Summary](./docs/codebase-summary.md) - Code structure overview
- [Code Standards](./docs/code-standards.md) - Coding conventions
- [Project Roadmap](./docs/project-roadmap.md) - Development phases
- [Deployment Guide](./docs/deployment-guide.md) - Production deployment

## 📊 Current Status

**Phase 1-3 Complete (60%)**

- ✅ Project setup & infrastructure
- ✅ Authentication & user management
- ✅ Storage & file management (Complete)
  - ✅ SMB integration
  - ✅ Folder CRUD operations
  - ✅ Document upload/download
  - ✅ File system sync (two-pass with soft delete)
  - ✅ Dashboard statistics API
  - ✅ Upload progress tracking
  - ✅ Enhanced metadata extraction (dates, MIME type)
  - ✅ Real-time sync (WebSocket)
  - ✅ Automated sync scheduling
- 🔲 Authorization (RBAC + ABAC)
- 🔲 Document viewer & security
- 🔲 Version control
- 🔲 Local edit integration
- 🔲 Testing & deployment

## 📝 License

Private - Internal use only

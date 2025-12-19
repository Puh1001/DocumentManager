# Quick Start Guide

Hướng dẫn nhanh để chạy, build và lint ứng dụng.

## 📋 Prerequisites

- Node.js 20+
- Docker & Docker Compose (cho database)
- PostgreSQL 16+ (hoặc dùng Docker)

## 🚀 Setup Lần Đầu

### 1. Install Dependencies

```bash
npm install
```

### 2. Start Database

```bash
# Start PostgreSQL và Redis
docker-compose up -d postgres redis

# Kiểm tra status
docker-compose ps
```

### 3. Setup Environment

Tạo file `.env` trong `apps/api/` với các biến sau:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/iso_docs?schema=public"

# JWT
JWT_SECRET="your-secret-key-change-in-production"
JWT_EXPIRES_IN="7d"
JWT_REFRESH_SECRET="your-refresh-secret-key"
JWT_REFRESH_EXPIRES_IN="30d"

# API
API_PORT=3001
CORS_ORIGIN="http://localhost:3000"

# SMB Configuration
# Development (Windows): Direct UNC path or mounted drive
SMB_SERVER=10.0.60.30
SMB_SHARE=Public
SMB_BASE_PATH=IT-Information Technology Dept\devTest
SMB_USE_MOUNTED_DRIVE=false  # Set to true if using mapped drive (e.g., Z:)
SMB_MOUNTED_DRIVE=Z:  # Only used if SMB_USE_MOUNTED_DRIVE=true

# Production (Linux): Mounted path (from Docker volume)
# SMB_MOUNT_PATH=/shared  # Path in container (mounted from host /mnt/smb)
#
# Note: For production, setup Systemd Service to mount SMB share on host.
# See docs/deployment-guide.md for detailed instructions.
```

**Lưu ý:** Thay thế các giá trị với thông tin thực tế của bạn, đặc biệt là SMB credentials.

### 4. Setup Database

```bash
# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push

# Seed initial data (tạo admin user)
cd apps/api && npx ts-node prisma/seed.ts && cd ../..
```

## 🏃 Development Commands

### Chạy Development Mode

```bash
# Chạy cả frontend và backend (Turborepo)
npm run dev

# Hoặc chạy riêng từng app:
cd apps/web && npm run dev      # Frontend: http://localhost:3000
cd apps/api && npm run dev      # Backend: http://localhost:3001
```

**Access Points:**

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- API Docs (Swagger): http://localhost:3001/api/docs
- Prisma Studio: `npm run db:studio`

### Build Production

```bash
# Build tất cả apps
npm run build

# Build riêng từng app:
cd apps/web && npm run build    # Build Next.js
cd apps/api && npm run build    # Build NestJS
```

### Lint Code

```bash
# Lint tất cả apps
npm run lint

# Lint riêng từng app:
cd apps/web && npm run lint     # Next.js ESLint
cd apps/api && npm run lint     # NestJS ESLint
```

### Type Check

```bash
# Type check từng app:
cd apps/web && npm run type-check
cd apps/api && npm run type-check
```

## 📦 Database Commands

```bash
# Generate Prisma client
npm run db:generate

# Push schema (development)
npm run db:push

# Create migration (production)
npm run db:migrate

# Open Prisma Studio (GUI)
npm run db:studio
```

## 🧪 Testing

```bash
# Run all tests
npm run test

# Run tests cho từng app:
cd apps/api && npm run test
cd apps/api && npm run test:watch
cd apps/api && npm run test:cov
```

## 🎨 Format Code

```bash
# Format tất cả files
npm run format
```

## 🐳 Docker Commands

### Development

```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Production

```bash
# Build và start
docker-compose -f docker-compose.prod.yml up -d --build

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Stop
docker-compose -f docker-compose.prod.yml down
```

## 🔧 Troubleshooting

### Port đã được sử dụng

```bash
# Windows: Tìm process đang dùng port
netstat -ano | findstr :3000
netstat -ano | findstr :3001

# Kill process (thay PID bằng process ID)
taskkill /PID <PID> /F
```

### Database connection error

```bash
# Kiểm tra PostgreSQL đang chạy
docker-compose ps postgres

# Restart database
docker-compose restart postgres

# Xem logs
docker-compose logs postgres
```

### Module not found errors

```bash
# Xóa node_modules và reinstall
rm -rf node_modules package-lock.json
npm install

# Hoặc clean install
npm ci
```

### Prisma client not generated

```bash
# Generate lại Prisma client
npm run db:generate

# Nếu vẫn lỗi, xóa và generate lại
cd apps/api
rm -rf node_modules/.prisma
npx prisma generate
```

## 📝 Common Workflows

### Daily Development

```bash
# 1. Start database
docker-compose up -d postgres

# 2. Start dev servers
npm run dev

# 3. Mở browser
# Frontend: http://localhost:3000
# API Docs: http://localhost:3001/api/docs
```

### Before Commit

```bash
# 1. Lint code
npm run lint

# 2. Type check
cd apps/web && npm run type-check
cd apps/api && npm run type-check

# 3. Format code
npm run format

# 4. Run tests (nếu có)
npm run test
```

### Production Build

```bash
# 1. Build all apps
npm run build

# 2. Test production build
cd apps/api && npm run start:prod
cd apps/web && npm run start
```

## 🎯 Quick Reference

| Command               | Description               |
| --------------------- | ------------------------- |
| `npm run dev`         | Start development servers |
| `npm run build`       | Build for production      |
| `npm run lint`        | Lint all code             |
| `npm run test`        | Run tests                 |
| `npm run format`      | Format code with Prettier |
| `npm run db:generate` | Generate Prisma client    |
| `npm run db:push`     | Push schema to database   |
| `npm run db:studio`   | Open Prisma Studio        |

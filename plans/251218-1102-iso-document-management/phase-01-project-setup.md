# Phase 1: Project Setup & Infrastructure

**Status:** 🟢 Completed  
**Priority:** P0 - Critical  
**Estimated Time:** 2-3 days

---

## Context

Thiết lập cấu trúc monorepo với Next.js frontend và NestJS backend, cấu hình database, và CI/CD pipeline cơ bản.

## Requirements

- [x] Git repository initialized
- [x] Monorepo structure với Turborepo
- [x] Next.js 15 (App Router) setup
- [x] NestJS 10 setup
- [x] PostgreSQL + Prisma configuration
- [x] Docker Compose for local development
- [x] Environment configuration

## Architecture

```
documentsManager/
├── apps/
│   ├── web/                    # Next.js Frontend
│   │   ├── src/
│   │   │   ├── app/           # App Router pages
│   │   │   ├── components/    # React components
│   │   │   ├── lib/           # Utilities
│   │   │   └── hooks/         # Custom hooks
│   │   └── package.json
│   └── api/                    # NestJS Backend
│       ├── src/
│       │   ├── modules/       # Feature modules
│       │   ├── common/        # Shared utilities
│       │   └── main.ts
│       └── package.json
├── packages/
│   └── shared/                 # Shared types
│       ├── src/
│       │   └── types/
│       └── package.json
├── prisma/
│   └── schema.prisma
├── docker-compose.yml
├── turbo.json
└── package.json
```

## Implementation Steps

### 1.1 Initialize Monorepo

```bash
# Install Turborepo
npx create-turbo@latest

# Configure workspace structure
```

### 1.2 Setup Next.js Frontend

```bash
cd apps/web
npx create-next-app@latest . --typescript --tailwind --eslint --app
npx shadcn@latest init
```

### 1.3 Setup NestJS Backend

```bash
cd apps/api
npx @nestjs/cli new . --package-manager npm
npm install @nestjs/config @nestjs/swagger
```

### 1.4 Configure Prisma

```bash
npm install prisma @prisma/client
npx prisma init
```

### 1.5 Docker Compose

```yaml
version: "3.8"
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: documents_db
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

## Todo List

- [x] Create monorepo with Turborepo
- [x] Setup Next.js app with Tailwind + ShadcnUI
- [x] Setup NestJS API
- [x] Configure Prisma + PostgreSQL
- [x] Create Docker Compose file
- [x] Setup environment variables
- [x] Configure ESLint + Prettier
- [x] Create shared package for types
- [x] Test build pipeline

## Success Criteria

- `npm run dev` starts both frontend and backend
- Prisma connects to PostgreSQL
- Hot reload works on both apps
- ShadcnUI components render correctly

## Related Files

- `turbo.json` - Turborepo configuration
- `docker-compose.yml` - Local database
- `prisma/schema.prisma` - Database schema
- `.env.example` - Environment template

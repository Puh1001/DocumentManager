# Phase 02 - Backend API Deployment (NestJS)

## Context Links

- Parent plan: `plans/20251223-1530-deploy-docs-bestpacific-vn/plan.md`
- Phase dependency: Phase 01 (server & environment).
- Research: `research/researcher-01-deploy-backend-nginx-docker.md`
- Docs: `docs/system-architecture.md`, `docs/codebase-summary.md`

## Overview

- **Description**: Build và chạy `apps/api` (NestJS) bằng Docker Compose trên server 10.0.60.28, expose trên port nội bộ (ví dụ 3001) để nginx reverse proxy.
- **Priority**: High
- **Implementation Status**: Not started
- **Review Status**: Pending

## Key Insights

- API đang được thiết kế để chạy trong Docker theo `docker-compose.prod.yml`.
- Cần `.env` riêng cho production, không commit vào repo.

## Requirements

- Docker & Docker Compose đã OK (Phase 01).
- Database (Postgres) và Redis được cấu hình trong Compose hoặc external.

## Architecture

- Service `api` trong Compose:
  - Build từ `apps/api/Dockerfile`.
  - Kết nối `postgres`, `redis` qua internal network.
  - Port container: `3001`.

## Related Code Files

- `apps/api/Dockerfile`
- `apps/api/src/main.ts`
- `docker-compose.prod.yml`

## Implementation Steps

1. **Review Dockerfile API**
   - Mở `apps/api/Dockerfile`, xác nhận:
     - Multi-stage build.
     - Expose port (thường 3001).
2. **Tạo env file production cho API trên server**
   - Tại `/opt/documents-manager/apps/api/.env.production` (ví dụ):
     - `DATABASE_URL=postgresql://...`
     - `JWT_SECRET=...`
     - `SMB_MOUNT_PATH=/shared` (prod).
     - Các env khác theo `docs/codebase-summary.md`.
3. **Cấu hình docker-compose.prod.yml cho API**
   - Trong `docker-compose.prod.yml`, đảm bảo có:
     - Service `api`:
       - `build: ./apps/api` hoặc `image: <your-registry>/documents-api:tag`.
       - `env_file: ./apps/api/.env.production`.
       - `ports: ["3001:3001"]` (hoặc chỉ internal nếu nginx nằm trong cùng network).
       - `depends_on: [postgres, redis]`.
4. **Khởi chạy stack DB + API**
   - `cd /opt/documents-manager`.
   - `docker compose -f docker-compose.prod.yml up -d postgres redis` (nếu chưa chạy).
   - `docker compose -f docker-compose.prod.yml up -d api`.
5. **Kiểm tra health API**
   - `docker compose ps` xác nhận `api` running.
   - `curl http://localhost:3001/api/health`.
6. **Log & debug nếu lỗi**
   - `docker compose logs api -f`.
   - Kiểm tra connection DB, env, migrate DB nếu cần (`npm run db:push` hoặc qua container).

## Todo List (Phase 02)

- [ ] Tạo file `.env.production` cho API trên server.
- [ ] Cập nhật/verify service `api` trong `docker-compose.prod.yml`.
- [ ] Start Postgres/Redis containers.
- [ ] Start API container.
- [ ] Gọi `GET /api/health` trên localhost thành công.

## Success Criteria

- API container chạy ổn định, không crash.
- Health endpoint trả về 200 trên `http://localhost:3001/api/health`.

## Risk Assessment

- Sai `DATABASE_URL` → API không khởi động.
- Sai `SMB_MOUNT_PATH` → lỗi storage liên quan SMB.

## Security Considerations

- Không expose Postgres/Redis ra ngoài internet.
- JWT secret đủ mạnh và chỉ nằm trong env file server.

## Next Steps

- Phase 03: Deploy frontend Next.js.

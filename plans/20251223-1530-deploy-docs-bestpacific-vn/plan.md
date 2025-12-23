# Plan - Triển khai docs.bestpacific.vn lên server 10.0.60.28

## Overview

- **Goal**: Deploy hệ thống ISO Document Management (Next.js + NestJS + Postgres + SMB) lên server `10.0.60.28` với domain `docs.bestpacific.vn`, chạy qua Docker Compose + nginx (đã có sẵn).
- **Scope**:
  - Chuẩn bị server & Docker.
  - Deploy backend API.
  - Deploy frontend web.
  - Cấu hình nginx + domain + SSL.
  - Testing, monitoring cơ bản và rollback plan.

## Phases & Status

1. **Phase 01 - Server & Environment Setup** (infra)
   - File: `phase-01-server-and-environment-setup.md`
   - Status: ⏳ Not started
2. **Phase 02 - Backend API Deployment (NestJS)**
   - File: `phase-02-backend-api-deployment.md`
   - Status: ⏳ Not started
3. **Phase 03 - Frontend Web Deployment (Next.js)**
   - File: `phase-03-frontend-web-deployment.md`
   - Status: ⏳ Not started
4. **Phase 04 - nginx, Domain & SSL**
   - File: `phase-04-nginx-domain-and-ssl.md`
   - Status: ⏳ Not started
5. **Phase 05 - Testing, Monitoring & Rollback**
   - File: `phase-05-testing-and-rollback.md`
   - Status: ⏳ Not started

## Quick Execution Guide (tóm tắt thao tác chính)

**Bước 1 – Chuẩn bị server (Phase 01)**

- SSH vào `10.0.60.28`, update OS, cài/kiểm tra Docker + Docker Compose.
- Kiểm tra nginx (`nginx -t`).
- Tạo thư mục `/opt/documents-manager` và clone repo `documentsManager`.

**Bước 2 – Deploy backend API (Phase 02)**

- Tạo `/opt/documents-manager/apps/api/.env.production` theo `docs/codebase-summary.md`.
- Kiểm tra `docker-compose.prod.yml` có service `api` (port 3001) + Postgres/Redis.
- `docker compose -f docker-compose.prod.yml up -d postgres redis api`.
- Test `curl http://localhost:3001/api/health`.

**Bước 3 – Deploy frontend web (Phase 03)**

- Tạo `/opt/documents-manager/apps/web/.env.production` với `NEXT_PUBLIC_API_BASE_URL=https://docs.bestpacific.vn/api`.
- Đảm bảo Compose có service `web` (port 3000).
- `docker compose -f docker-compose.prod.yml up -d web`.
- Test `curl -I http://localhost:3000`.

**Bước 4 – nginx + domain + SSL (Phase 04)**

- Đảm bảo DNS `docs.bestpacific.vn` trỏ về IP server.
- Cập nhật file `/etc/nginx/sites-available/docs.bestpacific.vn`:
  - `location /api/` → `http://127.0.0.1:3001/`.
  - `location /` → `http://127.0.0.1:3000`.
- `sudo nginx -t && sudo systemctl reload nginx`.
- (Tuỳ chọn) Cài Certbot và chạy `certbot --nginx -d docs.bestpacific.vn` để bật HTTPS.

**Bước 5 – Testing & rollback (Phase 05)**

- Truy cập `https://docs.bestpacific.vn`, test login, dashboard, documents, i18n.
- Theo dõi logs Docker + nginx, xử lý lỗi.
- Ghi lại cách rollback (đổi tag image/compose về version cũ, `docker compose up -d`).

## References

- Research:
  - `research/researcher-01-deploy-backend-nginx-docker.md`
  - `research/researcher-02-deploy-frontend-nextjs-nginx-docker.md`
- Docs:
  - `docs/system-architecture.md`
  - `docs/codebase-summary.md`
  - `docs/project-overview-pdr.md`

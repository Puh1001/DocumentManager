# Phase 03 - Frontend Web Deployment (Next.js)

## Context Links

- Parent plan: `plans/20251223-1530-deploy-docs-bestpacific-vn/plan.md`
- Phase dependency: Phase 01, Phase 02.
- Research: `research/researcher-02-deploy-frontend-nextjs-nginx-docker.md`
- Docs: `docs/system-architecture.md`, `docs/codebase-summary.md`

## Overview

- **Description**: Build và chạy `apps/web` (Next.js 14 App Router) bằng Docker Compose trên server, expose qua internal port (3000) cho nginx.
- **Priority**: High
- **Implementation Status**: Not started
- **Review Status**: Pending

## Key Insights

- Web app phụ thuộc vào API backend qua HTTPs (`/api`).
- Cần cấu hình `NEXT_PUBLIC_API_BASE_URL` khớp với domain nginx.

## Requirements

- API đã chạy ổn định (Phase 02).
- Docker Compose sẵn sàng build `apps/web`.

## Architecture

- Service `web` trong Compose:
  - Build từ `apps/web/Dockerfile`.
  - Chạy `next start -p 3000`.
  - Port mapping `3000:3000` (hoặc internal only nếu nginx trong Docker).

## Related Code Files

- `apps/web/Dockerfile`
- `apps/web/next.config.mjs`
- `docker-compose.prod.yml`

## Implementation Steps

1. **Review Dockerfile Web**
   - Mở `apps/web/Dockerfile` để confirm:
     - Multi-stage build (`next build`).
     - Stage runtime chạy `next start`.
2. **Tạo env file production cho Web**
   - Tại `/opt/documents-manager/apps/web/.env.production` (ví dụ):
     - `NEXT_PUBLIC_API_BASE_URL=https://docs.bestpacific.vn/api`
     - Bất kỳ env i18n / basePath nếu dùng.
3. **Cấu hình docker-compose.prod.yml cho Web**
   - Đảm bảo có service `web`:
     - `build: ./apps/web` hoặc `image: <your-registry>/documents-web:tag`.
     - `env_file: ./apps/web/.env.production`.
     - `ports: ["3000:3000"]` (hoặc internal).
     - `depends_on: [api]`.
4. **Build & Run container Web**
   - `cd /opt/documents-manager`.
   - `docker compose -f docker-compose.prod.yml up -d web`.
5. **Kiểm tra Web trên localhost**
   - `curl -I http://localhost:3000`.
   - Truy cập tạm thời qua SSH port forwarding nếu cần (dev).
6. **Kiểm tra Web gọi được API**
   - Dùng browser ở client: sau khi cấu hình nginx (Phase 04), confirm gọi API OK.

## Todo List (Phase 03)

- [ ] Tạo file `.env.production` cho Web trên server.
- [ ] Cập nhật/verify service `web` trong `docker-compose.prod.yml`.
- [ ] Build & start container `web`.
- [ ] Xác nhận `http://localhost:3000` trả về 200.

## Success Criteria

- Container `web` chạy ổn định.
- Next.js phục vụ trang dashboard/login không lỗi khi gọi API.

## Risk Assessment

- Sai `NEXT_PUBLIC_API_BASE_URL` → frontend gọi sai API.
- Vấn đề i18n/locale nếu base URL/config khác môi trường dev.

## Security Considerations

- Không expose port 3000 public nếu không cần (chỉ cho nginx).
- Env chỉ chứa public config (`NEXT_PUBLIC_*`) và non-secret.

## Next Steps

- Phase 04: nginx + domain + SSL cấu hình cho `docs.bestpacific.vn`.

# Research Report: Deploy Next.js 14 (App Router) with Docker & nginx

_Date: 2025-12-23_

## Executive Summary

- **Goal**: triển khai `apps/web` (Next.js 14 App Router) trong Docker, phục vụ qua nginx trên domain `docs.bestpacific.vn`.
- **Kết luận**:
  - Build Next.js thành Docker image (production) dùng `next build` + `next start` (hoặc `next export`/static nếu kiến trúc cho phép, nhưng ở đây app có auth/API nên dùng `next start`).
  - Chạy container web trên internal port (ví dụ 3000), expose cho nginx.
  - nginx làm reverse proxy `location /` (trừ `/api`) đến web container.
  - Dùng cùng Certbot/nginx SSL như backend.

## Research Methodology

- Nguồn: docs Next.js 14 deployment, best practices Docker + nginx 2023–2024.
- Từ khoá: `Next.js 14 app router docker nginx`, `next start behind nginx`, `Next.js production reverse proxy`.

## Key Findings

### 1. Next.js 14 Deployment Modes

- Với App Router + auth, REST API backend riêng:
  - Mode khuyến nghị: **`next build` + `next start`** (Node server).
  - Static export (`next export`) không phù hợp cho dynamic routes / auth phức tạp.
- Cần set các env:
  - API base URL (ví dụ `NEXT_PUBLIC_API_BASE_URL=https://docs.bestpacific.vn/api`).
  - Bất kỳ secret server-side khác đặt qua env trong container.

### 2. Docker Pattern cho Next.js

- Multi-stage:
  - Stage 1: install deps + `next build`.
  - Stage 2: chỉ copy `.next`, `node_modules` production, `public`, `next.config.mjs`, chạy `next start -p 3000`.
- Best practices:
  - Set `NODE_ENV=production`.
  - Tắt telemetry (`NEXT_TELEMETRY_DISABLED=1`).
  - Dọn `devDependencies` khỏi runtime image.

### 3. nginx Reverse Proxy cho Next.js

- Pattern:
  - `location /` (hoặc `/app`) proxy đến `http://127.0.0.1:3000`.
  - `location /_next/` và `location /static/` cũng đi cùng proxy (Next sẽ tự xử lý).
  - Cần ưu tiên route `/api` cho backend trước, sau đó `location /` cho web.
- Headers:
  - `proxy_set_header Host $host;`
  - `proxy_set_header X-Real-IP $remote_addr;`
  - `proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;`
  - `proxy_set_header X-Forwarded-Proto $scheme;`

### 4. Performance / Caching

- Cho static assets (`/_next/static`, `/favicon.ico`, v.v.):
  - Có thể thêm `expires` / `cache-control` ở nginx layer.
- Tránh gzip double-compress:
  - Hoặc bật gzip trên nginx, hoặc để Next xử lý; không nên cả hai.

### 5. Integration với Backend API

- Frontend gọi API qua URL công khai:
  - Ví dụ: `https://docs.bestpacific.vn/api/...`
  - Cần đồng nhất env `NEXT_PUBLIC_API_BASE_URL`.
- Khi chạy dev/prod:
  - Dev: có thể trỏ `http://localhost:3001`.
  - Prod: trỏ `https://docs.bestpacific.vn/api`.

## Implementation Recommendations

### Quick Start Checklist cho Frontend

1. Chuẩn bị env file prod cho web (`apps/web/.env.production`) trên server:
   - `NEXT_PUBLIC_API_BASE_URL=https://docs.bestpacific.vn/api`
   - Các biến i18n, basePath nếu dùng.
2. Đảm bảo Dockerfile trong `apps/web` hỗ trợ build prod.
3. Cập nhật/kiểm tra `docker-compose.prod.yml`:
   - Service `web` build từ `apps/web`, port `3000:3000`.
4. Trên server:
   - `docker-compose -f docker-compose.prod.yml up -d web`.
   - `curl http://localhost:3000` để test.
5. Cập nhật nginx:
   - `location /` → proxy_pass `http://127.0.0.1:3000;`
   - `location /api` đã trỏ tới API.
6. Reload nginx; test `https://docs.bestpacific.vn`.

### Common Pitfalls

- Env `NEXT_PUBLIC_API_BASE_URL` không khớp → web gọi sai host.
- Quên flag `--port` nếu container dùng port khác.
- Config nginx không ưu tiên `/api` trước `/` làm API bị match sai location.

## Unresolved Questions

- Bạn muốn tách domain API riêng (ví dụ `api.docs.bestpacific.vn`) hay dùng chung `/api` trên `docs.bestpacific.vn`?
- Có yêu cầu đặc biệt về caching cho static assets (logo, js, css) hay chấp nhận default?

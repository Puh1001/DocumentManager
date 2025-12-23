# Research Report: Deploy NestJS API with Docker Compose & nginx reverse proxy

_Date: 2025-12-23_

## Executive Summary

- **Goal**: chuẩn hoá cách deploy `apps/api` (NestJS) trong project này lên server 10.0.60.28, chạy qua Docker Compose, expose qua nginx reverse proxy dưới domain `docs.bestpacific.vn` (ví dụ route `/api`).
- **Kết luận**:
  - Dùng **Dockerfile trong `apps/api`** + `docker-compose.prod.yml` để build image, chạy container API trên internal network (ví dụ port 3001).
  - Dùng **nginx trên host** (bạn đã cấu hình sẵn) để reverse proxy `location /api` tới `http://localhost:<api_internal_port>`.
  - Quản lý config sensitive bằng **env file trên server** (không commit `.env`), mount cho container API.
  - Đảm bảo **healthcheck** (ví dụ `/api/health`) và log/monitor cơ bản.

## Research Methodology

- Nguồn: best practices NestJS + Docker + nginx 2023–2024, docs NestJS, Docker, community articles.
- Từ khoá: `NestJS docker compose nginx reverse proxy production best practices`, `NestJS health check docker`, `Node behind nginx keepalive_timeout`.

## Key Findings

### 1. Containerization Pattern cho NestJS

- Build multi-stage Docker image:
  - Stage build: cài deps, build TypeScript sang JS.
  - Stage runtime: chỉ copy output + production deps, chạy `node dist/main.js`.
- Best practices:
  - Set `NODE_ENV=production`.
  - Bật `helmet`, `compression` trong Nest (nếu chưa).
  - Không expose database/redis ports public; chỉ internal docker network.

### 2. Docker Compose cho API

- Một service `api` trong `docker-compose.prod.yml`:
  - `build: ./apps/api` (hoặc dùng image đã push).
  - `ports: ["3001:3001"]` (hoặc internal only nếu nginx chạy trong network Docker).
  - `env_file: ./apps/api/.env.production` (trên server).
  - `depends_on: [postgres, redis]` nếu dùng chung stack.
- Với kiến trúc hiện tại:
  - DB (Postgres) và Redis cũng nên chạy bằng Docker (đã được mô tả trong `system-architecture.md`).

### 3. nginx Reverse Proxy cho API

- Pattern phổ biến:
  - nginx listen 80/443.
  - `location /api/` proxy_pass đến `http://127.0.0.1:3001/` hoặc `http://api:3001/` (nếu nginx cũng chạy trong Docker network).
- Tuning cơ bản:
  - `proxy_http_version 1.1;`
  - `proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;`
  - `proxy_set_header X-Forwarded-Proto $scheme;`
  - `proxy_read_timeout 300;` (vì có thể stream file lớn).

### 4. SSL / HTTPS

- Let’s Encrypt + Certbot nginx plugin:
  - Chạy `certbot --nginx -d docs.bestpacific.vn` trên server.
  - Certbot tự thêm server block 443 + redirect 80 → 443.
- Quan trọng:
  - nginx terminate SSL, container API chỉ cần HTTP nội bộ.

### 5. Logging, Monitoring

- API:
  - Log ra stdout/stderr (Docker capture).
  - Enable Nest logger with context.
- nginx:
  - `access_log` + `error_log` riêng cho domain `docs.bestpacific.vn`.
  - Dùng `tail -f` để debug khi deploy lần đầu.

## Implementation Recommendations

### Quick Start Checklist cho Backend

1. Chuẩn bị `.env.production` cho API trên server (DATABASE_URL, JWT_SECRET, SMB_xxx, v.v.).
2. Đảm bảo `docker-compose.prod.yml` đã define service `api`, `postgres`, `redis` (nếu cần).
3. Trên server:
   - `git clone` hoặc `git pull` repo.
   - `docker-compose -f docker-compose.prod.yml pull` (nếu dùng remote images).
   - `docker-compose -f docker-compose.prod.yml up -d api postgres redis`.
4. Kiểm tra API:
   - `curl http://localhost:3001/api/health`.
5. Cập nhật nginx config để route `/api` đến `localhost:3001`.
6. Reload nginx, test lại `https://docs.bestpacific.vn/api/health`.

### Common Pitfalls

- Quên mở port nội bộ / mapping port sai.
- Quên update `CORS` / `APP_URL` để Next.js gọi đúng API.
- Quên set `X-Forwarded-*` headers khi ở sau nginx (ảnh hưởng log / redirect).

## Unresolved Questions

- Server 10.0.60.28 đang dùng OS nào (Ubuntu / CentOS / Windows Server)?
- Bạn muốn chạy Postgres/Redis trên cùng server hay đã có instance khác?

# Phase 01 - Server & Environment Setup cho 10.0.60.28

## Context Links

- Parent plan: `plans/20251223-1530-deploy-docs-bestpacific-vn/plan.md`
- Research:
  - `research/researcher-01-deploy-backend-nginx-docker.md`
  - `research/researcher-02-deploy-frontend-nextjs-nginx-docker.md`
- Docs kiến trúc:
  - `docs/system-architecture.md`
  - `docs/project-overview-pdr.md`

## Overview

- **Date**: 2025-12-23
- **Description**: Chuẩn hoá môi trường server 10.0.60.28 để sẵn sàng chạy stack Docker (Postgres, Redis, API, Web) + nginx reverse proxy cho `docs.bestpacific.vn`.
- **Priority**: High
- **Implementation Status**: Not started
- **Review Status**: Pending

## Key Insights

- Hệ thống dùng Docker Compose (`docker-compose.prod.yml`) để chạy toàn bộ stack.
- nginx đã được cài sẵn (theo bạn mô tả), nhưng cần đảm bảo:
  - Được cấu hình chuẩn mainline (sites-enabled, logs riêng).
  - Có quyền dùng Certbot (nếu cần HTTPS public/intranet).

## Requirements

- SSH access đến `10.0.60.28` với quyền sudo.
- Đảm bảo server có đủ:
  - CPU/RAM cho Postgres + Redis + 2 container Node.js.
  - Storage cho DB + SMB mount (`/shared`).

## Architecture

- Layer hạ tầng:
  - OS (giả định Ubuntu Server LTS).
  - Docker + Docker Compose.
  - nginx host process (không chạy trong Docker, theo mô hình hiện tại).

## Related Code / Files

- Root: `docker-compose.prod.yml`
- Docs: `docs/system-architecture.md`, `docs/codebase-summary.md`

## Implementation Steps

1. **Kiểm tra OS & package cơ bản**
   - `ssh <user>@10.0.60.28`
   - `lsb_release -a` hoặc `cat /etc/os-release` để confirm distro.
   - `sudo apt update && sudo apt upgrade -y`.
2. **Cài đặt Docker & Docker Compose**
   - Cài Docker Engine (theo docs official Docker).
   - Cài `docker-compose` hoặc dùng Docker Compose v2 (`docker compose`).
   - Thêm user vào group `docker` (tuỳ policy).
3. **Kiểm tra nginx**
   - `nginx -v`.
   - Kiểm tra cấu trúc: `/etc/nginx/nginx.conf`, `/etc/nginx/sites-available`, `/etc/nginx/sites-enabled`.
   - Xác nhận file config bạn đã viết nằm trong `sites-available` và có symlink trong `sites-enabled`.
   - `sudo nginx -t` để verify.
4. **Chuẩn bị thư mục project**
   - Chọn path, ví dụ: `/opt/documents-manager`.
   - `sudo mkdir -p /opt/documents-manager`.
   - `sudo chown -R <user>:<group> /opt/documents-manager`.
5. **Clone repository**
   - `cd /opt/documents-manager`.
   - `git clone <repo-url> .` (hoặc `git pull` nếu đã clone).
6. **Chuẩn bị thư mục dành cho volumes**
   - DB data: ví dụ `/opt/documents-manager/data/postgres`.
   - Redis data: `/opt/documents-manager/data/redis` (nếu dùng).
   - Log: `/opt/documents-manager/logs` (tuỳ config).

## Todo List (Phase 01)

- [ ] SSH thành công vào server 10.0.60.28 với quyền sudo.
- [ ] Cập nhật OS packages.
- [ ] Cài (hoặc verify) Docker & Docker Compose.
- [ ] Verify nginx hoạt động, config không lỗi.
- [ ] Tạo thư mục `/opt/documents-manager` và clone repo.
- [ ] Tạo thư mục volumes cho DB/Redis/log.

## Success Criteria

- Có thể chạy `docker --version`, `docker compose version`, `nginx -t` mà không lỗi.
- Repo `documentsManager` nằm trong path chuẩn và sẵn sàng build.

## Risk Assessment

- **Rủi ro**: Docker version quá cũ hoặc OS không supported.
- **Giảm thiểu**: Bám theo hướng dẫn official Docker cho đúng distro.

## Security Considerations

- Hạn chế user được vào group `docker`.
- Phân quyền đúng cho thư mục data (đặc biệt Postgres).

## Next Steps

- Sang **Phase 02**: cấu hình và deploy backend API bằng Docker + Compose.

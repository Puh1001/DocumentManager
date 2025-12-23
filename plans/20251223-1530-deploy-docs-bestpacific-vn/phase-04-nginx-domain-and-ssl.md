# Phase 04 - nginx, Domain & SSL cho docs.bestpacific.vn

## Context Links

- Parent plan: `plans/20251223-1530-deploy-docs-bestpacific-vn/plan.md`
- Phase dependency: Phase 01–03.
- Research:
  - `research/researcher-01-deploy-backend-nginx-docker.md`
  - `research/researcher-02-deploy-frontend-nextjs-nginx-docker.md`

## Overview

- **Description**: Dùng nginx (đã cài sẵn) để reverse proxy:
  - `https://docs.bestpacific.vn/` → Next.js web container (port 3000).
  - `https://docs.bestpacific.vn/api` → NestJS API container (port 3001).
  - Cấu hình SSL (Let’s Encrypt) nếu domain truy cập qua internet / internal CA.
- **Priority**: Critical
- **Implementation Status**: Not started
- **Review Status**: Pending

## Key Insights

- nginx chạy trên host, containers web/api expose cổng nội bộ.
- Cần DNS record trỏ `docs.bestpacific.vn` → IP server (public hoặc internal).

## Requirements

- Containers `web` (3000) và `api` (3001) đã chạy OK.
- Có quyền chỉnh sửa cấu hình nginx và restart service.

## Architecture

- nginx:
  - listen 80 (and 443 nếu bật SSL).
  - server_name `docs.bestpacific.vn`.
  - proxy_pass đến `http://127.0.0.1:3000` (web) & `http://127.0.0.1:3001` (api).

## Related Files (Server-side)

- `/etc/nginx/nginx.conf`
- `/etc/nginx/sites-available/docs.bestpacific.vn`
- `/etc/nginx/sites-enabled/docs.bestpacific.vn` (symlink)

## Implementation Steps

1. **Cấu hình DNS**
   - Đảm bảo `A record` hoặc `CNAME` trỏ `docs.bestpacific.vn` → IP của 10.0.60.28 (hoặc IP public của gateway nếu có NAT).
2. **Tạo (hoặc cập nhật) server block nginx**
   - File `/etc/nginx/sites-available/docs.bestpacific.vn`:
     - `server_name docs.bestpacific.vn;`
     - `listen 80;`
     - `access_log /var/log/nginx/docs.bestpacific.vn.access.log;`
     - `error_log /var/log/nginx/docs.bestpacific.vn.error.log;`
   - Locations:
     - `location /api/ { proxy_pass http://127.0.0.1:3001/; ... }`
     - `location / { proxy_pass http://127.0.0.1:3000; ... }`
3. **Bật site và test config**
   - `sudo ln -s /etc/nginx/sites-available/docs.bestpacific.vn /etc/nginx/sites-enabled/` (nếu chưa).
   - `sudo nginx -t`.
   - `sudo systemctl reload nginx`.
4. **Cấu hình SSL (nếu dùng Let’s Encrypt)**
   - Cài Certbot:
     - `sudo apt install certbot python3-certbot-nginx`.
   - Cấp chứng chỉ:
     - `sudo certbot --nginx -d docs.bestpacific.vn`.
   - Kiểm tra auto-renew:
     - `sudo systemctl status certbot.timer`.
5. **Kiểm tra từ client**
   - Mở `https://docs.bestpacific.vn`:
     - Trang login/dashboard hiển thị.
   - Kiểm tra API:
     - `https://docs.bestpacific.vn/api/health`.

## Todo List (Phase 04)

- [ ] DNS record cho `docs.bestpacific.vn` trỏ đúng IP server.
- [ ] Cập nhật file nginx `docs.bestpacific.vn`.
- [ ] Test `nginx -t` OK và reload.
- [ ] Cấp chứng chỉ SSL (Let’s Encrypt hoặc CA nội bộ).
- [ ] Confirm web & API chạy qua HTTPS.

## Success Criteria

- Truy cập `https://docs.bestpacific.vn` OK, không cảnh báo SSL (nếu dùng public CA).
- Endpoint `https://docs.bestpacific.vn/api/health` trả về 200.

## Risk Assessment

- Port 80/443 bị firewall chặn → không truy cập được domain.
- Certbot không cấp được cert (DNS sai, không port 80).

## Security Considerations

- Bật HTTPS bắt buộc (redirect 80 → 443).
- Cấu hình `X-Forwarded-Proto` và các security headers (HSTS, X-Frame-Options, v.v.) nếu cần.

## Next Steps

- Phase 05: Testing E2E, monitoring & rollback plan.



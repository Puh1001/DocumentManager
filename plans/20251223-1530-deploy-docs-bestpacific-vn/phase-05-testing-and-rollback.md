# Phase 05 - Testing, Monitoring & Rollback

## Context Links

- Parent plan: `plans/20251223-1530-deploy-docs-bestpacific-vn/plan.md`
- Phase dependency: Phase 01–04.

## Overview

- **Description**: Kiểm thử end-to-end, kiểm tra performance cơ bản, log/monitoring, và chuẩn hoá kịch bản rollback khi deploy docs.bestpacific.vn.
- **Priority**: High
- **Implementation Status**: Not started
- **Review Status**: Pending

## Key Insights

- Hệ thống có nhiều thành phần (web, api, db, smb) nên cần test flows chính:
  - Login, duyệt folder, xem tài liệu, dashboard stats.

## Requirements

- Toàn bộ stack đã chạy (Phase 01–04 complete).

## Architecture

- Testing ở 3 tầng:
  - Health/Status: container & endpoints.
  - Business flows: login, browse, view.
  - Performance cơ bản: response time, tải file.

## Implementation Steps

1. **Health & Status**
   - `docker compose ps` xem trạng thái containers.
   - `curl https://docs.bestpacific.vn/api/health`.
2. **Functional Testing**
   - Login với user thật (hoặc test).
   - Mở dashboard → xác nhận KPI/stats chạy.
   - Mở màn documents:
     - Duyệt tree.
     - Xem PDF/DOCX.
   - Kiểm thử i18n cơ bản (vi/en/zh).
3. **Performance Smoke Test**
   - Đo thời gian load dashboard lần đầu.
   - Đo thời gian mở một vài tài liệu lớn.
4. **Logging & Monitoring**
   - Kiểm tra `docker compose logs` cho api/web.
   - Kiểm tra logs nginx `/var/log/nginx/docs.bestpacific.vn.*`.
5. **Rollback Plan**
   - Chiến lược đơn giản:
     - Giữ lại version image/container cũ (tag cụ thể).
     - Đảm bảo `docker-compose.prod.yml` có thể switch về tag cũ và `docker compose up -d` lại.
   - Ghi lại quy trình rollback step-by-step trong file report riêng (nếu cần).

## Todo List (Phase 05)

- [ ] Chạy health checks cho API & web.
- [ ] Test login, browse, view documents.
- [ ] Kiểm tra UI, i18n, và dashboard KPI trên production.
- [ ] Rà log Docker + nginx, xử lý lỗi nếu có.
- [ ] Viết quy trình rollback ngắn gọn (dựa trên tag image/compose).

## Success Criteria

- Tất cả flow chính chạy ổn, không lỗi nghiêm trọng.
- Có quy trình rollback rõ ràng, đã được thử ít nhất 1 lần (dry-run).

## Risk Assessment

- Bug chỉ xuất hiện trên production SMB path.
- Performance chậm khi đồng bộ nhiều file.

## Security Considerations

- Không log thông tin nhạy cảm (password, JWT) ra logs.
- Đảm bảo HTTPS dùng cipher suite an toàn (nếu internet-facing).

## Next Steps

- Sau khi Phase 05 ổn định: bổ sung monitoring nâng cao, alerting và tài liệu vận hành chi tiết hơn.

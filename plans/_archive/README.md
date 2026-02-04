# Plans Archive

Thư mục này chứa các kế hoạch đã hoàn thành được nén lại để tiết kiệm tài nguyên.

## Các kế hoạch đã được archive:

1. **251219-refactor-storage-services.zip** - Refactor storage services
2. **251219-sync-orphaned-cleanup.zip** - Sync orphaned cleanup
3. **251225-github-actions-ci.zip** - GitHub Actions CI setup
4. **251225-gitlab-ci-completion.zip** - GitLab CI completion
5. **251225-phase3-completion.zip** - Phase 3 completion (upload progress, metadata extraction, realtime sync, sync scheduling)
6. **251225-refactor-folder-sync.zip** - Refactor folder sync service
7. **20251223-1205-i18n-implementation.zip** - i18n Implementation (completed - all phases done)
8. **20251223-1825-maintenance-notices.zip** - Maintenance Notices Feature (completed - superseded by full implementation)
9. **20251224-0921-maintenance-department-edit-delete.zip** - Maintenance Department & Edit/Delete (completed - merged into full implementation)
10. **20251223-1530-web-server-entrypoint-debug.zip** - Web Server Entrypoint Debug (resolved - Dockerfile shows correct entrypoint)
11. **20251223-1740-prod-websocket-404-debug.zip** - Production WebSocket 404 Debug (resolved - WebSocket implementation exists)
12. **20251224-1403-full-maintenance-backend-frontend.zip** - Full Maintenance Backend & Frontend (completed - all phases done)
13. **20251225-1028-fix-websocket-and-api-errors.zip** - Fix WebSocket and API Errors (completed - all phases done)
14. **20251225-1354-boss-role-ui.zip** - BOSS Role UI Implementation (completed - all phases done)
15. **20251225-1522-folder-role-mapping.zip** - Folder Role Mapping (completed - all phases done)
16. **20251225-1720-boss-role-simplified-ui.zip** - BOSS Role Simplified UI (completed - all phases done)
17. **260121-department-name-standardization.zip** - Department name standardization (migration completed)
18. **260121-1422-improve-migration-scripts.zip** - Improve migration scripts (improvements completed)
19. **260121-kpi-status-completion-tracking.zip** - KPI status completion tracking (implemented)
20. **260122-0747-document-optimization-realtime-sync.zip** - Document optimization & real-time sync (all phases done)
21. **260122-1515-fix-filename-encoding-complete.zip** - Fix filename encoding (completed)
22. **260122-kpi-attachment-deletion-workflow.zip** - KPI attachment deletion workflow (completed)
23. **260123-document-folder-restructure.zip** - Document folder restructure (phases 1-6 done)
24. **20260107-1700-user-multi-department-kpi.zip** - Multi-department user KPI (all phases done)
25. **20241222-1430-kpi-tab-implementation.zip** - KPI tab implementation (completed)
26. **260130-1359-remove-folder-tree-flat-document-list.zip** - Remove folder tree, flat document list UI (all phases Done)
27. **20260130-1201-iso-documents-rename-and-ui.zip** - ISO documents rename & table UI (all phases Done)
28. **20260130-0806-monthly-kpi-uploads.zip** - Monthly KPI uploads (all phases Done)
29. **20260203-0736-department-folders-auto-create-upload.zip** - Department folders auto-create & ISO upload (all phases Done)
30. **260130-1456-iso-documents-redesign.zip** - ISO documents redesign, client table (phases 00–05 done)
31. **260130-1517-mandatory-storage-structure.zip** - Mandatory storage structure (implementation + migration done)
32. **260121-fix-vietnamese-filename-encoding.zip** - Fix Vietnamese filename encoding (single-file plan)
33. **260123-0819-implement-code-review-suggestions.zip** - Implement code review suggestions (single-file plan)
34. **260123-simplify-encoding-fix.zip** - Simplify encoding fix (single-file plan)
35. **260126-unique-id-filename-implementation.zip** - Unique ID filename implementation (single-file plan)
36. **260129-boss-document-viewer-ui-fix.zip** - Boss document viewer UI fix (single-file plan)
37. **260129-fix-kpi-current-current-cleanup.zip** - Fix KPI current/cleanup (single-file plan)

Báo cáo trạng thái (2026-01-30): **plans-completion-report-20260130.md**

## Cách sử dụng:

Để xem lại nội dung của một kế hoạch đã archive:

```powershell
Expand-Archive -Path "251225-refactor-folder-sync.zip" -DestinationPath "../temp" -Force
```

Sau khi xem xong, có thể xóa thư mục temp:

```powershell
Remove-Item -Path "../temp" -Recurse -Force
```

## Lưu ý:

- Các file zip này chỉ để tham khảo, không cần thiết cho việc phát triển hiện tại
- Có thể xóa các file zip này nếu cần giải phóng thêm không gian
- Ngày archive: 2025-12-25
- Cập nhật: 2026-02-04 (thêm 12 plan: remove folder tree, iso rename & UI, monthly KPI uploads, dept folders auto-create, iso redesign, mandatory storage, + 6 single-file plans)

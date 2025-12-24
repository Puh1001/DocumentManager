# Project Overview - PDR (Product Development Requirements)

**Project Name:** ISO Document Management System (Librarian Model)  
**Version:** 1.0.0  
**Created:** 2024-12-18  
**Last Updated:** 2025-01-XX  
**Status:** 🟢 In Development (Phase 1-3 Complete, Additional Features Added - 65%)

---

## Executive Summary

Hệ thống quản lý tài liệu ISO theo mô hình "Thủ thư" - Web application quản lý metadata và phân quyền, trong khi lưu trữ và chỉnh sửa file diễn ra trực tiếp trên shared folder (Local Network Storage).

## Problem Statement

- Tài liệu ISO cần được quản lý chặt chẽ với version control
- Cần phân quyền chi tiết: ai được xem, tải, in, chỉnh sửa
- File gốc phải giữ nguyên định dạng, không upload lên cloud
- Người dùng cần chỉnh sửa trực tiếp bằng ứng dụng local (Word, Excel)

## Solution

Xây dựng web-based document management system:

- **Web UI**: Browse, view, search documents
- **Backend API**: Manage metadata, permissions, versioning
- **Storage**: SMB/CIFS shared folder on local network
- **Viewer**: In-browser PDF/DOCX viewer with copy protection
- **Local Edit**: Open files directly in desktop applications

## Target Users

| User Type           | Description                            |
| ------------------- | -------------------------------------- |
| Admin               | Quản trị hệ thống, phân quyền          |
| Document Controller | Quản lý tài liệu ISO, upload/version   |
| Manager             | Duyệt và approve tài liệu              |
| Staff               | Xem, download tài liệu được phân quyền |

## Core Features

### 1. File & Storage Management

- Connect to SMB shared folder
- Browse folder tree
- Upload documents with versioning
- File streaming for web viewer
- **Two-pass file system sync** with soft delete
- **Dashboard statistics** API
- Automatic detection of deleted/renamed/moved files

### 1.5. Department Management

- Department CRUD operations
- Department listing and management UI
- Integration with KPI and maintenance features
- Department-based filtering and access control

### 1.6. KPI Tracking

- KPI record management by department and year
- Monthly metric tracking with auto-calculations
- Chart visualization (Chart.js)
- Excel export functionality
- Real-time data updates

### 1.7. Maintenance Notices

- Create and manage maintenance notices
- Department-specific notices
- Dashboard integration (upcoming notices display)
- Edit and delete functionality

### 2. Authorization (RBAC + ABAC)

- Role-based access control
- Folder-level permissions
- Document-level permissions
- Actions: View, Download, Print, Edit, Delete

### 3. Document Viewer

- In-browser PDF viewer
- DOCX to HTML conversion
- Copy protection (disable right-click, Ctrl+C/P)
- Watermarking

### 4. Version Control

- Automatic versioning on upload
- Version history with user tracking
- Restore previous versions
- File integrity verification (checksum)

### 5. Local Edit Integration

- "Open to Edit" button
- Direct access to network file
- Change detection and auto-versioning

## Non-Functional Requirements

| Requirement      | Target                              |
| ---------------- | ----------------------------------- |
| Response Time    | < 200ms for API calls               |
| Concurrent Users | 10,000-50,000 (scalable)            |
| File Size Limit  | 100MB per file                      |
| Uptime           | 99.9%                               |
| Security         | OWASP Top 10 compliant              |
| Authentication   | Username/password (separate system) |
| Storage Access   | Windows Domain Auth (SMB)           |

## Tech Stack

- **Frontend:** Next.js 14 (App Router), Tailwind CSS, ShadcnUI
- **Backend:** NestJS 10, REST API
- **Database:** PostgreSQL 16 + Prisma ORM
- **Auth:** JWT + Passport (username/password)
- **Storage:** SMB/CIFS via direct file system access (Node.js fs)
- **Viewer:** PDF (iframe), DOCX (mammoth.js)
- **Authorization:** CASL (RBAC + ABAC)
- **i18n:** next-intl (English, Vietnamese, Chinese)
- **Charts:** Chart.js (for KPI visualization)
- **Monorepo:** Turborepo
- **Container:** Docker + Docker Compose
- **CI/CD:** GitHub Actions (CI, Docker build, security scan, deploy)

## Success Metrics

- [ ] 100% documents accessible via web UI
- [ ] Zero data loss in version control
- [ ] < 5s document load time
- [ ] 95% user adoption within 1 month

## Timeline

| Phase                        | Duration       | Status         |
| ---------------------------- | -------------- | -------------- |
| Phase 1-2: Foundation        | 1 week         | ✅ Complete    |
| Phase 3: Storage & Files    | 1.5 weeks      | ✅ Complete    |
| Additional Features         | Ongoing        | ✅ In Progress |
| - Department Management      | -              | ✅ Complete    |
| - KPI Tracking               | -              | ✅ Complete    |
| - Maintenance Notices         | -              | ✅ Complete    |
| - Internationalization       | -              | ✅ Complete    |
| Phase 4: Authorization      | 1 week         | 🔄 In Progress |
| Phase 5-6: Document Features | 1 week         | 🔲 Pending     |
| Phase 7-8: Integration & QA  | 1 week         | 🔲 Pending     |
| **Total**                    | **~4.5 weeks** | **65% Done**   |

## Risks & Mitigations

| Risk                         | Mitigation                          |
| ---------------------------- | ----------------------------------- |
| SMB connectivity issues      | Fallback to mounted drive           |
| Browser file:// restrictions | Copy-to-clipboard with instructions |
| Large file performance       | Streaming + chunked upload          |

## Stakeholders

- Product Owner: [TBD]
- Tech Lead: [TBD]
- Backend Developer: [TBD]
- Frontend Developer: [TBD]
- QA Engineer: [TBD]

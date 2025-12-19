# ISO Document Management System - Implementation Plan

**Project:** Hệ thống Quản lý Tài liệu ISO (Librarian Model)  
**Created:** 2024-12-18  
**Status:** 🟢 In Progress  
**Scope:** Document Management + Permissions (MVP)  
**Scale:** ~10,000-50,000 users  
**Auth:** Username/Password (separate system)  
**Storage:** Windows Domain Auth for SMB

---

## Overview

Hệ thống quản lý tài liệu theo mô hình "Thủ thư" - Web quản lý metadata/phân quyền, lưu trữ trên shared folder (SMB/CIFS).

## Tech Stack

| Layer         | Technology                                      |
| ------------- | ----------------------------------------------- |
| Frontend      | Next.js 15 (App Router), Tailwind CSS, ShadcnUI |
| Backend       | NestJS 10, REST API                             |
| Database      | PostgreSQL 16 + Prisma                          |
| Auth          | JWT + Passport (username/password)              |
| Storage       | SMB/CIFS (fs module - platform-aware)          |
| Viewer        | react-pdf-viewer, mammoth.js                    |
| Authorization | CASL (ABAC + RBAC)                              |

## Project Structure

```
documentsManager/
├── apps/
│   ├── web/          # Next.js frontend
│   └── api/          # NestJS backend
├── packages/
│   └── shared/       # Shared types/utilities
├── prisma/           # Database schema
├── docs/             # Documentation
└── plans/            # Implementation plans
```

## Implementation Phases

| #   | Phase                            | Status     | Priority | Link                                     |
| --- | -------------------------------- | ---------- | -------- | ---------------------------------------- |
| 1   | Project Setup & Infrastructure   | 🔴 Pending | P0       | [phase-01](./phase-01-project-setup.md)  |
| 2   | Authentication & User Management | 🔴 Pending | P0       | [phase-02](./phase-02-authentication.md) |
| 3   | Storage & File Management        | 🔴 Pending | P0       | [phase-03](./phase-03-storage.md)        |
| 4   | Authorization (RBAC + ABAC)      | 🔴 Pending | P1       | [phase-04](./phase-04-authorization.md)  |
| 5   | Document Viewer & Security       | 🔴 Pending | P1       | [phase-05](./phase-05-viewer.md)         |
| 6   | Version Control                  | 🔴 Pending | P1       | [phase-06](./phase-06-versioning.md)     |
| 7   | Local Edit Integration           | 🔴 Pending | P2       | [phase-07](./phase-07-local-edit.md)     |
| 8   | Testing & Deployment             | 🔴 Pending | P2       | [phase-08](./phase-08-testing.md)        |

## Timeline Estimate

- **Phase 1-2:** 1 week (Foundation)
- **Phase 3-4:** 1.5 weeks (Core Features)
- **Phase 5-6:** 1 week (Document Features)
- **Phase 7-8:** 1 week (Integration & QA)

**Total:** ~4.5 weeks

## Success Criteria

- [ ] Users can login/logout with username/password
- [ ] Files browsable from shared folder via web UI
- [ ] Document viewer works for PDF/DOCX with copy protection
- [ ] Version history tracked for all document changes
- [ ] RBAC+ABAC permissions enforced
- [ ] "Open in Local App" works for authorized users
- [ ] All APIs secured and rate-limited

## Risk Assessment

| Risk                         | Probability | Impact | Mitigation                 |
| ---------------------------- | ----------- | ------ | -------------------------- |
| SMB connectivity issues      | Medium      | High   | Fallback to mounted drive  |
| Browser file:// restrictions | High        | Medium | Custom protocol handler    |
| Large file performance       | Medium      | Medium | Streaming + chunked upload |

## Next Steps

1. Review & approve this plan
2. Create GitHub repository
3. Start Phase 1: Project Setup

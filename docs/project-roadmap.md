# Project Roadmap

**Last Updated:** 2026-01-10  
**Current Phase:** Phase 1-4 Complete, Additional Features Added (75%)

---

## Overview

Roadmap for ISO Document Management System development, organized into 8 phases over ~4.5 weeks.

## Phase Status

| Phase | Name                             | Status      | Progress | Duration |
| ----- | -------------------------------- | ----------- | -------- | -------- |
| 1     | Project Setup & Infrastructure   | ✅ Complete | 100%     | 2-3 days |
| 2     | Authentication & User Management | ✅ Complete | 100%     | 2-3 days |
| 3     | Storage & File Management        | ✅ Complete | 100%     | 3-4 days |
| 3.5   | Department Management            | ✅ Complete | 100%     | 1-2 days |
| 3.6   | KPI Tracking                     | ✅ Complete | 100%     | 3-4 days |
| 3.7   | Maintenance Notices              | ✅ Complete | 100%     | 1-2 days |
| 3.8   | Internationalization (i18n)      | ✅ Complete | 100%     | 1-2 days |
| 4     | Authorization (RBAC + ABAC)      | ✅ Complete | 100%     | 3-4 days |
| 5     | Document Viewer & Security       | 🔲 Pending  | 0%       | 2-3 days |
| 6     | Version Control                  | 🔲 Pending  | 0%       | 2-3 days |
| 7     | Local Edit Integration           | 🔲 Pending  | 0%       | 2 days   |
| 8     | Testing & Deployment             | 🔲 Pending  | 0%       | 3-4 days |

---

## Phase 1: Project Setup & Infrastructure ✅

**Status:** Complete  
**Duration:** 2-3 days  
**Completed:** 2024-12-18

### Completed Tasks

- [x] Monorepo setup with Turborepo
- [x] Next.js 14 frontend with App Router
- [x] NestJS 10 backend structure
- [x] PostgreSQL + Prisma configuration
- [x] Docker Compose for local development
- [x] Shared package for types/utilities
- [x] Environment configuration
- [x] Basic project structure

### Deliverables

- ✅ Monorepo structure
- ✅ Development environment
- ✅ Database schema foundation
- ✅ Docker setup

---

## Phase 2: Authentication & User Management ✅

**Status:** Complete  
**Duration:** 2-3 days  
**Completed:** 2024-12-18  
**Updated:** 2026-01-06

### Completed Tasks

- [x] Prisma schema for User, Role, Session
- [x] AuthModule with JWT + Passport
- [x] Login/logout/refresh endpoints
- [x] User CRUD operations
- [x] Login page UI
- [x] Auth context/provider
- [x] Protected route wrapper
- [x] Database seeding
- [x] **Case-insensitive username login** (normalized to lowercase)
- [x] **Admin dept users migration** (50 users with department mapping)

### Deliverables

- ✅ Authentication system
- ✅ User management API
- ✅ Login UI
- ✅ Session management
- ✅ Case-insensitive login support
- ✅ User migration scripts

### Default Credentials

- Username: `admin` (case-insensitive)
- Password: `admin123`

---

## Phase 3: Storage & File Management ✅

**Status:** Complete  
**Duration:** 3-4 days  
**Priority:** P0 - Critical  
**Completed:** 2024-12-22

### Completed Tasks

- [x] SMB service implementation
- [x] Folder CRUD operations
- [x] Document upload/download
- [x] File streaming endpoint
- [x] Folder tree component
- [x] File browser UI
- [x] File system sync (two-pass with soft delete)
- [x] Dashboard statistics API
- [x] Service refactoring (SRP compliance)
- [x] Checksum utility (SHA-256)
- [x] System user utility
- [x] Upload with progress tracking
- [x] Enhanced file metadata extraction (dates, MIME type)
- [x] Real-time sync (WebSocket with file watcher)
- [x] Sync scheduling/automation (cron jobs)

### Deliverables

- ✅ Folder management API
- ✅ Document upload/download
- ✅ File browser UI
- ✅ SMB integration
- ✅ File system sync
- ✅ Dashboard statistics

---

## Phase 3.5: Department Management ✅

**Status:** Complete  
**Duration:** 1-2 days  
**Completed:** 2024-12-XX

### Completed Tasks

- [x] Department database schema (Prisma)
- [x] Department API module (NestJS)
- [x] Department CRUD endpoints
- [x] Department management UI
- [x] Integration with KPI and maintenance features

### Deliverables

- ✅ Department management API
- ✅ Department management UI
- ✅ Department integration with other modules

---

## Phase 3.6: KPI Tracking ✅

**Status:** Complete  
**Duration:** 3-4 days  
**Completed:** 2024-12-XX  
**Updated:** 2026-01-06

### Completed Tasks

- [x] KPI database schema (Department, KpiRecord, KpiMetric, KpiAttachment)
- [x] KPI API module (NestJS)
- [x] KPI record CRUD operations
- [x] KPI metric management
- [x] Auto-calculation logic (efficiency, averages)
- [x] Chart visualization (Chart.js)
- [x] Excel export functionality
- [x] KPI management UI
- [x] **Year selector dropdown** (current year ± 5 years)
- [x] Support for historical and future year data entry
- [x] **PDF attachment upload/view/delete** (2026-01-10)
- [x] **File deletion with move to "delete files" folder** (2026-01-10)

### Deliverables

- ✅ KPI tracking system
- ✅ Chart visualization
- ✅ Excel export
- ✅ KPI management UI
- ✅ Year selector for viewing/editing data by year
- ✅ PDF attachment management (upload, view, delete)
- ✅ File deletion with move to "delete files" folder

---

## Phase 3.7: Maintenance Notices ✅

**Status:** Complete  
**Duration:** 1-2 days  
**Completed:** 2024-12-XX

### Completed Tasks

- [x] Maintenance notice data model
- [x] Maintenance notice hook (localStorage)
- [x] Maintenance notice form UI
- [x] Maintenance notice list UI
- [x] Department filtering
- [x] Edit and delete functionality
- [x] Dashboard integration
- [x] Internationalization support

### Deliverables

- ✅ Maintenance notice management
- ✅ Dashboard integration
- ✅ Department filtering

---

## Phase 3.8: Internationalization (i18n) ✅

**Status:** Complete  
**Duration:** 1-2 days  
**Completed:** 2024-12-XX

### Completed Tasks

- [x] next-intl integration
- [x] Locale-based routing
- [x] Translation files (English, Vietnamese, Chinese)
- [x] Translation coverage for all features
- [x] Locale switcher (if implemented)

### Deliverables

- ✅ Multi-language support
- ✅ Translation infrastructure
- ✅ Localized UI

---

## Phase 4: Authorization (RBAC + ABAC) ✅

**Status:** Complete  
**Duration:** 3-4 days  
**Priority:** P1 - High  
**Progress:** 100%

### Completed Tasks

- [x] CASL ability factory (complete)
- [x] Permission models (FolderPermission, DocumentPermission)
- [x] PoliciesGuard implementation (complete)
- [x] Permission management API (complete)
- [x] Role-based permissions (RBAC)
- [x] Folder-level permissions (ABAC)
- [x] Document-level permissions (ABAC)
- [x] Page-level permissions (User, Department, KPI, Maintenance, Permission)
- [x] Permission inheritance logic
- [x] Boss role implementation (read-only access)
- [x] Permission management UI (complete)
- [x] Frontend route protection (`useCanAccess` hook)
- [x] Sidebar navigation filtering
- [x] AccessDenied component
- [x] Conditional rendering based on permissions

### Deliverables

- ✅ RBAC + ABAC system (backend + frontend)
- ✅ Permission management API
- ✅ Permission management UI
- ✅ Permission enforcement (PoliciesGuard backend, useCanAccess frontend)
- ✅ CASL ability factory
- ✅ Boss role support
- ✅ Frontend route protection
- ✅ Navigation filtering

---

## Phase 5: Document Viewer & Security 🔲

**Status:** Pending  
**Duration:** 2-3 days  
**Priority:** P1 - High

### Tasks

- [ ] PDF viewer component
- [ ] DOCX viewer (mammoth.js)
- [ ] Copy protection hook
- [ ] Watermark component
- [ ] Document view page
- [ ] Download/print button control
- [ ] Loading and error states

### Deliverables

- PDF/DOCX viewer
- Copy protection
- Watermarking
- Security features

---

## Phase 6: Version Control 🔲

**Status:** Pending  
**Duration:** 2-3 days  
**Priority:** P1 - High

### Tasks

- [ ] Version storage structure
- [ ] Version service implementation
- [ ] Version API endpoints
- [ ] Version history UI
- [ ] Restore functionality
- [ ] Version comparison (optional)
- [ ] Checksum verification

### Deliverables

- Version history
- Restore functionality
- Version management UI

---

## Phase 7: Local Edit Integration 🔲

**Status:** Pending  
**Duration:** 2 days  
**Priority:** P2 - Medium

### Tasks

- [ ] LocalEditService
- [ ] Open-path API endpoint
- [ ] OpenLocalButton component
- [ ] OpenFolderButton component
- [ ] Copy-to-clipboard functionality
- [ ] Instruction dialog
- [ ] File change detection (optional)
- [ ] Audit logging for edits

### Deliverables

- "Open to Edit" feature
- Folder opening
- Network path generation

---

## Phase 8: Testing & Deployment 🔲

**Status:** Pending  
**Duration:** 3-4 days  
**Priority:** P2 - Medium

### Tasks

- [ ] Unit tests (services)
- [ ] Integration tests (APIs)
- [ ] E2E tests (critical flows)
- [ ] Security testing
- [ ] Performance testing
- [ ] Production Docker setup
- [ ] Environment configuration
- [ ] Deployment documentation
- [x] CI/CD pipeline (GitHub Actions: CI, Docker, Security, Deploy)

### Deliverables

- Test suite (>80% coverage)
- Production deployment
- Documentation
- CI/CD pipeline (GitHub Actions workflows)

---

## Timeline Summary

```
Week 1: Phase 1-2 (Foundation) ✅
Week 2: Phase 3 (Storage & Files) ✅
Week 2-3: Phase 3.5-3.8 (Additional Features) ✅
Week 3-4: Phase 4 (Authorization) ✅ (Backend + Frontend)
Week 4-5: Phase 5-6 (Document Features) 🔲
Week 5-6: Phase 7-8 (Integration & QA) 🔲
```

**Total Estimated Duration:** ~6 weeks (extended due to additional features)  
**Current Progress:** 80% complete

---

## Future Enhancements (Post-MVP)

### Phase 9: Advanced Features

- [x] KPI Tracking module ✅
- [ ] Equipment Maintenance module (enhanced)
- [ ] Improvement Items (CR) module
- [ ] Advanced search with full-text
- [ ] Document templates
- [ ] Bulk operations
- [ ] Export/import functionality

### Phase 10: Mobile & Integration

- [ ] Mobile app (React Native)
- [ ] Active Directory integration
- [ ] Email notifications
- [ ] Webhook support
- [ ] API for third-party integration

### Phase 11: Analytics & Reporting

- [ ] Usage analytics dashboard
- [ ] Document access reports
- [ ] User activity reports
- [ ] Storage usage reports
- [ ] Compliance reports

---

## Success Criteria

### MVP (Phase 1-8)

- [x] Users can login/logout
- [ ] Files browsable from shared folder
- [ ] Document viewer works for PDF/DOCX
- [ ] Version history tracked
- [ ] RBAC+ABAC permissions enforced
- [ ] "Open in Local App" works
- [ ] All APIs secured and rate-limited
- [ ] Test coverage >80%

### Production Ready

- [ ] Performance: <200ms API response time
- [ ] Scalability: Support 10,000+ concurrent users
- [ ] Security: OWASP Top 10 compliant
- [ ] Reliability: 99.9% uptime
- [ ] Documentation: Complete user and admin guides

---

## Risk Mitigation

| Risk                         | Impact | Mitigation                          | Status      |
| ---------------------------- | ------ | ----------------------------------- | ----------- |
| SMB connectivity issues      | High   | Fallback to mounted drive           | Monitored   |
| Browser file:// restrictions | Medium | Copy-to-clipboard with instructions | Addressed   |
| Large file performance       | Medium | Streaming + chunked upload          | Planned     |
| Permission complexity        | Medium | Incremental implementation          | In Progress |
| Scale to 10k+ users          | High   | Database optimization, caching      | Planned     |

---

## Notes

- **Current Focus:** Phase 3 (Storage & File Management)
- **Blockers:** None
- **Dependencies:** SMB share must be accessible from backend server
- **Assumptions:** Windows domain authentication for SMB access

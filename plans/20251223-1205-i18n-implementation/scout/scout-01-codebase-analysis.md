# Scout Report: Codebase Analysis for i18n Implementation

**Date:** 2025-12-23  
**Scope:** Frontend and Backend text localization

## Frontend Text Locations

### Hardcoded Vietnamese Text Found

**Navigation & Layout:**

- `apps/web/src/components/layout/sidebar.tsx`: Navigation items ("Tài liệu", "Phòng ban", "Người dùng", "Phân quyền", "Cài đặt")
- `apps/web/src/components/layout/header.tsx`: Logout button title ("Đăng xuất")

**Pages:**

- `apps/web/src/app/login/page.tsx`: Login form labels, placeholders, buttons ("Tên đăng nhập", "Mật khẩu", "Đăng nhập", "Đang đăng nhập...", "Hệ thống quản lý tài liệu ISO")
- `apps/web/src/app/dashboard/page.tsx`: Dashboard stats ("Tổng tài liệu", "Thư mục", "Người dùng", "Upload gần đây", "Tài liệu gần đây", "Hoạt động")
- `apps/web/src/app/dashboard/departments/page.tsx`: Department management ("Không tải được danh sách phòng ban", form labels)
- `apps/web/src/app/dashboard/kpi/page.tsx`: KPI page with extensive Vietnamese text

**Components:**

- `apps/web/src/components/documents/document-list.tsx`: Table headers ("Tên tài liệu", "Loại", "Kích thước", "Cập nhật", "Thao tác"), actions ("Xem", "Tải xuống", "Mở để chỉnh sửa", "Lịch sử phiên bản")
- `apps/web/src/components/documents/document-toolbar.tsx`: Toolbar buttons and labels
- `apps/web/src/components/documents/folder-tree.tsx`: Folder tree labels

**Error Messages:**

- `apps/web/src/lib/api.ts`: Error handling with Vietnamese messages
- Various components: Error states ("Không có tài liệu trong thư mục này")

## Backend Error Messages

### Exception Messages (English)

**Services with hardcoded messages:**

- `apps/api/src/modules/department/services/department.service.ts`: "Department not found", "Department code already exists"
- `apps/api/src/modules/auth/auth.service.ts`: "Invalid credentials", "Invalid or expired refresh token", "User not found"
- `apps/api/src/modules/users/users.service.ts`: "Username or email already exists", "User not found"
- `apps/api/src/modules/storage/services/folder.service.ts`: "Folder not found", "Parent folder not found or deleted"
- `apps/api/src/modules/storage/services/document.service.ts`: "Document not found", "Folder not found", "folderId is required", "file is required"
- `apps/api/src/modules/storage/services/version.service.ts`: "Document not found", "Version not found"
- `apps/api/src/modules/kpi/services/kpi-record.service.ts`: "KPI record not found"
- `apps/api/src/modules/kpi/services/kpi-metric.service.ts`: "KPI metric not found"
- `apps/api/src/modules/authorization/services/permission.service.ts`: Multiple error messages

**Exception Types Used:**

- `NotFoundException`
- `ConflictException`
- `BadRequestException`
- `UnauthorizedException`

## File Structure Analysis

### Frontend Structure

```
apps/web/src/
├── app/                    # App Router pages (need locale routing)
│   ├── layout.tsx         # Root layout (needs locale provider)
│   ├── login/
│   └── dashboard/
├── components/            # All components need translation
│   ├── layout/
│   ├── documents/
│   └── ui/
├── lib/
│   ├── api.ts             # Error handling needs i18n
│   └── auth-context.tsx
└── hooks/
```

### Backend Structure

```
apps/api/src/
├── modules/
│   ├── auth/              # Error messages
│   ├── users/             # Error messages
│   ├── department/        # Error messages
│   ├── storage/           # Error messages
│   └── kpi/               # Error messages
└── common/                # Potential exception filters
```

## Key Findings

1. **Frontend:** ~50+ hardcoded Vietnamese strings across components and pages
2. **Backend:** ~30+ hardcoded English error messages in services
3. **No existing i18n infrastructure:** No translation files or i18n library
4. **Route structure:** Currently flat (`/dashboard`, `/login`) - needs locale prefix (`/[locale]/dashboard`)
5. **Error handling:** Frontend catches backend errors but displays raw messages

## Files Requiring Changes

### Frontend (High Priority)

- All page components in `apps/web/src/app/`
- All UI components in `apps/web/src/components/`
- API client in `apps/web/src/lib/api.ts`
- Layout files

### Backend (Medium Priority)

- All service files with exception throws
- Exception filters (if exist)
- DTO validation messages

## Estimated Scope

- **Frontend files to modify:** ~20 files
- **Backend files to modify:** ~15 files
- **Translation keys needed:** ~100+ keys
- **Languages:** 3 (en, vi, zh)

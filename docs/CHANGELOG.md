# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added - 2026-01-06

- **Case-insensitive username login**: Users can now login with any case combination (V210889, v210889, etc.)
  - Username normalized to lowercase before database lookup
  - Improved user experience, reduced login errors

- **KPI Year Selector**: Added year dropdown selector to KPI page
  - Range: current year ± 5 years (11 years total)
  - Default: current year
  - Users can select specific year to view/edit KPI data
  - Supports historical data viewing and future year data entry (e.g., 2025)

- **Admin Dept Users Migration**: Migration script for 50 users with admin_dept role
  - Department code mapping from users.txt to existing database codes
  - Default password: bpvn@123$$ for all migrated users
  - Includes verification and test scripts
  - Full name and department information included

### Changed

- Authentication service: Username lookup now case-insensitive
- KPI page: Year selection moved from hardcoded to user-selectable dropdown
- User management: Added migration scripts for bulk user creation

### Technical Details

- **Auth Service** (`apps/api/src/modules/auth/auth.service.ts`):
  - Updated `validateUser()` to normalize username: `username.toLowerCase()`

- **KPI Page** (`apps/web/src/app/[locale]/dashboard/kpi/page.tsx`):
  - Changed from `const year = new Date().getFullYear()` to `useState(selectedYear)`
  - Added year selector dropdown in header
  - Updated all API calls to include `year` parameter

- **Migration Scripts** (`apps/api/prisma/seeds/`):
  - `migrate-admin-dept-users.ts`: Main migration script
  - `verify-admin-dept-users.ts`: Verification script
  - `test-admin-dept-login.ts`: Login test script
  - `test-case-insensitive-login.ts`: Case-insensitive login test

## [Previous Versions]

### 2024-12-XX

- Initial project setup
- Authentication & user management
- Storage & file management
- Department management
- KPI tracking (initial implementation)
- Maintenance notices
- Internationalization (i18n)
- Authorization (RBAC + ABAC)


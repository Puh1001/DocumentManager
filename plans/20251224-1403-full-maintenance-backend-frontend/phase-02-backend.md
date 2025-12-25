# Phase 2: Backend Module

**Parent Plan:** [plan.md](./plan.md)  
**Status:** ✅ Completed  
**Priority:** High

---

## Overview

Create maintenance module with controller, service, DTOs following NestJS patterns.

## Requirements

1. MaintenanceModule with proper imports
2. MaintenanceController with CRUD endpoints
3. MaintenanceService with business logic
4. DTOs for create/update operations
5. JWT authentication guards
6. Role-based authorization (managers/admins can modify)

## Architecture

### Module Structure

```
apps/api/src/modules/maintenance/
├── maintenance.module.ts
├── controllers/
│   └── maintenance.controller.ts
├── services/
│   └── maintenance.service.ts
└── dto/
    ├── create-maintenance-notice.dto.ts
    └── update-maintenance-notice.dto.ts
```

### API Endpoints

- `GET /maintenance` - List all notices (all users)
- `GET /maintenance/:id` - Get notice by ID (all users)
- `POST /maintenance` - Create notice (managers/admins)
- `PATCH /maintenance/:id` - Update notice (managers/admins)
- `DELETE /maintenance/:id` - Delete notice (managers/admins)

## Related Files

- `apps/api/src/app.module.ts` - Register MaintenanceModule
- `apps/api/src/modules/maintenance/*` - New module files

## Implementation Steps

- [x] Create maintenance module directory structure
- [x] Create DTOs (CreateMaintenanceNoticeDto, UpdateMaintenanceNoticeDto)
- [x] Create MaintenanceService with CRUD methods
- [x] Create MaintenanceController with endpoints
- [x] Add JWT auth guards
- [x] Add role-based authorization
- [x] Register module in AppModule
- [x] Add Swagger documentation
- [x] Add Maintenance to authorization Subjects type

## Success Criteria

- All endpoints work correctly
- Authentication required
- Authorization works (view vs modify)
- Swagger docs generated
- Error handling implemented

# Phase 01: Backend API - List All Documents Endpoint

## Context
- Parent: [plan.md](plan.md)
- Depends on: None
- Research: [researcher-01-report.md](research/researcher-01-report.md)

## Overview
- **Date:** 2026-01-30
- **Priority:** High
- **Description:** Create new API endpoint to list all documents with filters (status, departmentId, level)
- **Implementation status:** Done
- **Review status:** Done ([review report](reports/phase-01-code-review.md))

## Key Insights
- Current API only supports folder-specific document loading
- Need flat list endpoint for new UI design
- Filters: status (ACTIVE/ARCHIVED/DELETED), departmentId, level (future)
- Include folder and department info in response
- Apply permission checks (RBAC/ABAC)

## Requirements
- **Functional:** List all documents with optional filters
- **Non-functional:** Performance (no pagination initially), security (permission checks)

## Architecture
- New endpoint: `GET /storage/documents?status=...&departmentId=...&level=...`
- Service method: `DocumentService.findAll(filters)`
- Response includes: document fields, folder info, department info, version count
- Permission checks via PoliciesGuard

## Related code files
| File | Action |
|------|--------|
| `apps/api/src/modules/storage/controllers/document.controller.ts` | Add `findAll` endpoint |
| `apps/api/src/modules/storage/services/document.service.ts` | Add `findAll` method |
| `apps/api/src/modules/storage/services/document.service.spec.ts` | Add tests |

## Implementation Steps
1. Add `findAll` method to `DocumentService`
   - Accept filters: `{ status?, departmentId?, level? }`
   - Build Prisma where clause
   - Include folder and department relations
   - Include version count
   - Apply encoding fixes
2. Add `GET /storage/documents` endpoint to `DocumentController`
   - Accept query params: status, departmentId, level
   - Call `documentService.findAll`
   - Apply permission checks (PoliciesGuard)
3. Add tests for service and controller
   - Test with no filters (all documents)
   - Test with status filter
   - Test with departmentId filter
   - Test with multiple filters
   - Test permission checks

## Todo list
- [x] Add `findAll` method to DocumentService
- [x] Add `GET /storage/documents` endpoint to DocumentController
- [x] Add service tests
- [x] Add controller tests
- [x] Update API documentation (Swagger) - Auto-generated via @ApiOperation

## Success Criteria
- Endpoint returns all documents when no filters
- Filters work correctly (status, departmentId)
- Response includes folder and department info
- Permission checks applied
- Tests pass

## Risk Assessment
- **Low:** New endpoint, no breaking changes
- **Performance:** May need pagination if many documents (monitor)

## Security Considerations
- Apply RBAC/ABAC permission checks
- Filter by user's accessible folders/departments
- Respect document-level permissions

## Next steps
- Proceed to Phase 02 (Frontend redesign)

# Phase 2: Backend - Module Service & Dynamic Validation

**Date:** 2025-12-26  
**Status:** 🟢 Completed  
**Priority:** P1  
**Estimated Time:** 1 day

---

## Context

- **Parent Plan:** [plan.md](./plan.md)
- **Dependencies:** Phase 1
- **Related Docs:** `docs/code-standards.md`, `docs/system-architecture.md`

## Overview

Create ModuleService for CRUD operations and update CaslAbilityFactory to use dynamic module validation from database instead of hardcoded list.

## Key Insights

- Current module validation hardcoded in `CaslAbilityFactory.loadModulePermissions()`
- Need service to manage modules
- Dynamic validation enables adding modules without code changes
- Permission auto-generation when creating modules

## Requirements

- [x] Create `ModuleService` with CRUD operations
- [x] Create `ModuleController` with REST endpoints
- [x] Update `CaslAbilityFactory` to load modules from DB
- [x] Auto-generate permissions when creating module
- [x] Add module management to authorization module

## Architecture

### Module Service

```typescript
@Injectable()
export class ModuleService {
  async findAll(): Promise<Module[]>;
  async findOne(id: string): Promise<Module | null>;
  async create(dto: CreateModuleDto): Promise<Module>;
  async update(id: string, dto: UpdateModuleDto): Promise<Module>;
  async remove(id: string): Promise<void>;
  async autoGeneratePermissions(moduleName: string): Promise<void>;
}
```

### Dynamic Module Validation

```typescript
// In CaslAbilityFactory.loadModulePermissions()
const modules = await this.prisma.module.findMany({
  where: { isActive: true },
});
const moduleNames = modules.map((m) => m.name);

// Validate against dynamic modules
if (moduleNames.includes(module)) {
  // Valid module
}
```

### Permission Auto-Generation

When creating module, auto-generate standard permissions:

- `view:{Module}`
- `create:{Module}`
- `edit:{Module}`
- `delete:{Module}`
- `manage:{Module}`

## Related Code Files

- `apps/api/src/modules/authorization/services/module.service.ts` (new)
- `apps/api/src/modules/authorization/controllers/module.controller.ts` (new)
- `apps/api/src/modules/authorization/dto/create-module.dto.ts` (new)
- `apps/api/src/modules/authorization/dto/update-module.dto.ts` (new)
- `apps/api/src/modules/authorization/factories/casl-ability.factory.ts` (update)
- `apps/api/src/modules/authorization/authorization.module.ts` (update)

## Implementation Steps

1. Create DTOs for module CRUD
2. Create ModuleService with CRUD methods
3. Implement permission auto-generation
4. Create ModuleController with REST endpoints
5. Update CaslAbilityFactory to use dynamic modules
6. Add ModuleService to AuthorizationModule
7. Add unit tests
8. Update API documentation

## Todo List

- [x] Create CreateModuleDto
- [x] Create UpdateModuleDto
- [x] Create ModuleService
- [x] Implement permission auto-generation
- [x] Create ModuleController
- [x] Update CaslAbilityFactory
- [x] Add to AuthorizationModule
- [x] Write unit tests
- [x] Test API endpoints

## Success Criteria

- ✅ ModuleService CRUD operations work
- ✅ Permissions auto-generated when creating module
- ✅ CaslAbilityFactory uses dynamic module validation
- ✅ API endpoints protected with admin guard
- ✅ Unit tests pass

## Risk Assessment

| Risk                          | Probability | Impact | Mitigation                                       |
| ----------------------------- | ----------- | ------ | ------------------------------------------------ |
| Breaking existing permissions | Low         | High   | Validate module names match existing permissions |
| Performance degradation       | Low         | Medium | Cache module list in memory                      |

## Security Considerations

- Module endpoints protected with `manage:all` permission
- Validate module names (alphanumeric, no special chars)
- Prevent deletion of modules with assigned permissions

## Next Steps

- Phase 3: Frontend - Page Metadata System

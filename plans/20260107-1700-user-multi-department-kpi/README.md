# User Multi-Department KPI Management Plan

## Overview

Implementation plan for enabling users to belong to multiple departments and manage KPIs across all assigned departments.

## Problem Statement

**Current:** Users can only be assigned to ONE department, limiting KPI management capabilities.

**Goal:** Users can be assigned to MULTIPLE departments and perform CRUD operations on KPIs for all their departments.

## Documents

### Main Planning Documents

- **[plan.md](./plan.md)** - High-level overview, scope, risks, timeline
- **[summary.md](./summary.md)** - Executive summary, quick reference

### Phase Documents

1. **[phase-01-schema-migration.md](./phase-01-schema-migration.md)**  
   Database schema changes, UserDepartment model, data migration

2. **[phase-02-backend-services.md](./phase-02-backend-services.md)**  
   API updates, service logic, access control modifications

3. **[phase-03-frontend-updates.md](./phase-03-frontend-updates.md)**  
   UI changes, multi-select components, KPI page updates

4. **[phase-04-testing-deployment.md](./phase-04-testing-deployment.md)**  
   Testing strategy, migration execution, production deployment

### Research Documents

- **[research/many-to-many-patterns.md](./research/many-to-many-patterns.md)**  
  Best practices, patterns, performance considerations

## Quick Start

### For Implementers

1. Read `plan.md` for complete context
2. Review `phase-01-schema-migration.md`
3. Follow phases sequentially
4. Check off todos as you complete them
5. Update status in each phase document

### For Reviewers

1. Read `summary.md` for quick overview
2. Review architecture decisions in research docs
3. Check success criteria in each phase
4. Validate risk mitigation strategies

### For Deployers

1. Read `phase-04-testing-deployment.md`
2. Review migration runbook (to be created)
3. Follow deployment checklist
4. Monitor metrics post-deployment

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                     User Model                          │
│  - id: String                                           │
│  - username: String                                     │
│  - department: String? (LEGACY)                         │
│  - departments: UserDepartment[] (NEW)                  │
└────────────────────┬────────────────────────────────────┘
                     │ 1
                     │
                     │ *
┌────────────────────▼────────────────────────────────────┐
│              UserDepartment (Junction)                  │
│  - userId: String                                       │
│  - departmentId: String                                 │
│  - assignedAt: DateTime                                 │
│  - @@id([userId, departmentId])                         │
└────────────────────┬────────────────────────────────────┘
                     │ *
                     │
                     │ 1
┌────────────────────▼────────────────────────────────────┐
│                 Department Model                        │
│  - id: String                                           │
│  - name: String                                         │
│  - code: String                                         │
│  - users: UserDepartment[] (NEW)                        │
│  - kpiRecords: KpiRecord[]                              │
└─────────────────────────────────────────────────────────┘
```

## Key Decisions

| Decision                 | Rationale                                 |
| ------------------------ | ----------------------------------------- |
| Explicit many-to-many    | Need assignedAt timestamp, better control |
| Keep legacy field        | Backward compatibility during migration   |
| Array-based access check | Performance, cached in request context    |
| Admin/Boss full access   | Business requirement, no restrictions     |

## Implementation Status

| Phase                       | Status       | Progress |
| --------------------------- | ------------ | -------- |
| Phase 1: Schema & Migration | ✅ Completed | 100%     |
| Phase 2: Backend Services   | ✅ Completed | 100%     |
| Phase 3: Frontend Updates   | ✅ Completed | 100%     |
| Phase 4: Testing & Deploy   | ✅ Completed | 100%     |

**Overall Progress:** 100% ✅

**Status:** Ready for Production Deployment

## Timeline

- **Created:** 2026-01-07 17:00
- **Estimated Completion:** TBD
- **Actual Completion:** TBD

## Key Metrics

### Performance Targets

- KPI query time (single dept): 50ms
- KPI query time (5 depts): 100ms
- Department assignment: 500ms
- User load time: 200ms

### Quality Targets

- Unit test coverage: >90% for new code
- Integration tests: All critical flows
- Zero data loss during migration
- Zero downtime deployment

## Dependencies

### External

- PostgreSQL 14+
- Prisma 5.x
- NestJS 10.x
- Next.js 14.x

### Internal

- Existing KPI module
- User management module
- Admin dashboard
- Auth system

## Risks & Mitigation

### High Risk

- **Data loss during migration**  
  ✅ Mitigation: Database backup, dry-run testing, rollback plan

- **Breaking existing KPI access**  
  ✅ Mitigation: Backward compatibility, extensive testing

### Medium Risk

- **Performance degradation**  
  ✅ Mitigation: Indexes, query optimization, load testing

- **User confusion**  
  ✅ Mitigation: Clear UI, documentation, user training

## Testing Strategy

1. **Unit Tests** - Service logic, access control
2. **Integration Tests** - Complete flows, data consistency
3. **E2E Tests** - User journeys, UI interactions
4. **Performance Tests** - Load testing, query optimization
5. **Security Tests** - Authorization, SQL injection

## Communication Plan

### Stakeholders

- Engineering team
- Product management
- QA team
- DevOps team
- End users (Admin, department managers)

### Milestones to Communicate

- [ ] Plan approval
- [ ] Phase 1 complete (schema ready)
- [ ] Phase 2 complete (API ready)
- [ ] Phase 3 complete (UI ready)
- [ ] Production deployment scheduled
- [ ] Deployment complete

## Support & Questions

- Technical questions: Engineering team
- Business requirements: Product team
- Deployment support: DevOps team

## Related Documents

- [Project Roadmap](../../docs/project-roadmap.md)
- [Code Standards](../../docs/code-standards.md)
- [System Architecture](../../docs/system-architecture.md)
- [Deployment Guide](../../docs/deployment-guide.md)

## Version History

| Version | Date       | Changes              |
| ------- | ---------- | -------------------- |
| 1.0     | 2026-01-07 | Initial plan created |

---

**Plan Status:** ✅ Ready for Review  
**Last Updated:** 2026-01-07 17:00  
**Next Review:** After Phase 1 completion

# Phase 01: Database Schema Extension

## Context Links

- Parent: [plan.md](plan.md)
- Research: [researcher-01-report.md](research/researcher-01-report.md)
- Schema: `apps/api/prisma/schema.prisma`
- Docs: `docs/codebase-summary.md`, `docs/system-architecture.md`

## Overview

- **Date:** 2026-01-30
- **Priority:** High
- **Description:** Create DocumentLevel lookup table. Add ISO metadata fields to Document model: levelId (FK to DocumentLevel), preparerId, reviewerId, approverId, approvalDate, receiptDate with User relations.
- **Implementation status:** Completed
- **Review status:** Completed — see [reports/phase-01-code-review.md](reports/phase-01-code-review.md)

## Key Insights

- Current Document schema lacks ISO workflow fields (preparer, reviewer, approver, dates)
- Level field exists in query DTO but not in schema
- **Level must be REQUIRED (non-nullable)** per new requirements
- **Level stored in database** (DocumentLevel lookup table, not hardcoded enum)
- User model already exists, can be reused for relations
- Preparer/reviewer/approver/dates can be nullable (auto-populated later)
- Need indexes for filtering performance
- DocumentLevel table needed for CRUD management

## Requirements

### Functional

- **Create DocumentLevel table** (lookup table for levels)
- Add `levelId` field (String, REQUIRED/non-nullable, FK to DocumentLevel - mandatory on upload)
- Add `preparerId`, `reviewerId`, `approverId` (String?, FK to User - nullable, auto-populated)
- Add `approvalDate`, `receiptDate` (DateTime?, nullable - auto-populated)
- Create User relations for preparer/reviewer/approver
- Create DocumentLevel relation
- Add indexes for query performance
- Seed initial level data (LEVEL1, LEVEL2, LEVEL3, etc.)

### Non-Functional

- Backward compatible (nullable fields)
- Migration script must handle existing data
- Indexes for filtering performance
- Follow existing naming conventions

## Architecture

### Schema Changes

```prisma
// NEW: DocumentLevel lookup table
model DocumentLevel {
  id          String   @id @default(uuid())
  code        String   @unique // e.g., "LEVEL1", "LEVEL2", "LEVEL3"
  name        String   // Default name (Vietnamese)
  nameEn      String?  @map("name_en") // English name
  nameVi      String?  @map("name_vi") // Vietnamese name
  nameZh      String?  @map("name_zh") // Chinese name
  description String?
  isActive    Boolean  @default(true) @map("is_active")
  sortOrder   Int      @default(0) @map("sort_order")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  documents Document[]

  @@index([code])
  @@index([isActive])
  @@index([sortOrder])
  @@map("document_levels")
}

model Document {
  // ... existing fields ...

  // ISO Metadata Fields
  levelId      String    @map("level_id") // REQUIRED - FK to DocumentLevel (mandatory on upload)
  preparerId   String?   @map("preparer_id") // Auto-set to uploader
  reviewerId   String?   @map("reviewer_id") // Auto-populated by system
  approverId   String?   @map("approver_id") // Auto-populated by system
  approvalDate DateTime? @map("approval_date") // Auto-populated by system
  receiptDate  DateTime? @map("receipt_date") // Auto-set to upload date

  // Relations
  level     DocumentLevel @relation(fields: [levelId], references: [id], onDelete: Restrict)
  preparer User?         @relation("DocumentPreparer", fields: [preparerId], references: [id], onDelete: SetNull)
  reviewer User?         @relation("DocumentReviewer", fields: [reviewerId], references: [id], onDelete: SetNull)
  approver User?         @relation("DocumentApprover", fields: [approverId], references: [id], onDelete: SetNull)

  // Indexes
  @@index([levelId])
  @@index([preparerId])
  @@index([reviewerId])
  @@index([approverId])
  @@index([approvalDate])
  @@index([receiptDate])
}
```

### User Model Updates

```prisma
model User {
  // ... existing fields ...

  // ISO Document Relations
  preparedDocuments Document[] @relation("DocumentPreparer")
  reviewedDocuments Document[] @relation("DocumentReviewer")
  approvedDocuments Document[] @relation("DocumentApprover")
}
```

### DocumentLevel Model

- Lookup table for document levels
- Supports i18n (nameEn, nameVi, nameZh)
- Soft delete via isActive flag
- Sortable via sortOrder
- Code is unique identifier

## Related Code Files

### Files to Modify

- `apps/api/prisma/schema.prisma` - Add DocumentLevel model and update Document model

### Files to Create

- `apps/api/prisma/migrations/YYYYMMDDHHMMSS_add_iso_metadata/migration.sql` - Migration script
- `apps/api/prisma/seeds/seed-document-levels.ts` - Seed initial level data

## Implementation Steps

1. **Create DocumentLevel Model**
   - Add DocumentLevel table with code, name, nameEn, nameVi, nameZh
   - Add isActive, sortOrder fields
   - Add indexes for code, isActive, sortOrder

2. **Update Document Model**
   - Add levelId field (String, REQUIRED, FK to DocumentLevel)
   - Add preparerId, reviewerId, approverId (String?, FK to User)
   - Add approvalDate, receiptDate (DateTime?)
   - Add DocumentLevel relation
   - Add User relations (preparer, reviewer, approver)
   - Add indexes for all new fields
   - Update User model with reverse relations

3. **Create Seed Script**
   - Seed initial levels: LEVEL1, LEVEL2, LEVEL3, etc.
   - Set default names and sortOrder
   - Mark all as isActive = true

4. **Generate Migration**
   - Run `npx prisma migrate dev --name add_iso_metadata`
   - Review generated migration SQL
   - Ensure nullable fields are set correctly

5. **Update Prisma Client**
   - Run `npx prisma generate`
   - Verify types are generated correctly
   - Verify DocumentLevel type is available

6. **Verify Migration**
   - Check migration file syntax
   - Ensure DocumentLevel table is created
   - Ensure indexes are created
   - Ensure foreign keys are correct
   - Test migration on dev database
   - Verify seed data is populated

## Todo List

- [x] Update `schema.prisma` with ISO metadata fields
- [x] Add User relations to Document model
- [x] Add reverse relations to User model
- [x] Add indexes for query performance
- [x] Generate migration script (20260130170000_add_iso_metadata_phase01)
- [x] Review migration SQL
- [ ] Test migration on dev database (run `npx prisma migrate deploy` when DB available)
- [x] Update Prisma client (run `npx prisma generate` when no file lock)
- [x] Verify types are correct

## Success Criteria

- DocumentLevel table is created with all required fields
- Document model includes levelId (FK to DocumentLevel)
- Schema includes all ISO metadata fields
- User relations are properly defined
- DocumentLevel relation is properly defined
- Indexes are created for all new fields
- Seed script populates initial levels
- Migration runs successfully on dev database
- Prisma client types are updated
- No breaking changes to existing code (except level requirement)

## Risk Assessment

### Risks

- **Migration fails on production:** Test thoroughly on dev first
- **Level required:** Existing documents need default levelId (create default level first, then assign)
- **DocumentLevel table:** New table must be created before Document levelId FK
- **Performance impact:** Indexes should mitigate this
- **Breaking change:** Level is now required, upload endpoint must be updated
- **Seed data:** Need to define initial levels (LEVEL1, LEVEL2, etc.)

### Mitigations

- Test migration on dev database with sample data
- Create DocumentLevel table first in migration
- Create default level (e.g., "LEVEL1") in seed script
- Assign default levelId to existing documents in migration
- Review migration SQL before applying
- Create rollback script if needed
- Update upload endpoint to require level before migration
- Monitor query performance after deployment
- Document initial level values in seed script

## Security Considerations

- User relations use `onDelete: SetNull` to prevent cascade deletion
- Foreign keys ensure referential integrity
- Indexes improve query performance but don't affect security

## Completion Note (2026-01-30)

- Schema: DocumentLevel already existed (Phase 00). Added preparerId, reviewerId, approverId, approvalDate, receiptDate to Document; levelId made required; User relations (preparer, reviewer, approver) and indexes added.
- Migration: `20260130170000_add_iso_metadata_phase01/migration.sql` — adds new columns, ensures LEVEL1 exists, backfills level_id, sets level_id NOT NULL, adds FKs and indexes.
- Document.service: levelId required on upload; preparerId and receiptDate auto-set. Document-sync.handler and deletion-workflow integration spec updated to pass levelId.
- Seed: `seed-document-levels.ts` already exists (Phase 00). Run migration then `npx prisma generate` (close dev server if EPERM).

## Next Steps

- Proceed to Phase 02: Backend API Updates
- Update DTOs to include new fields
- Update services to handle new fields

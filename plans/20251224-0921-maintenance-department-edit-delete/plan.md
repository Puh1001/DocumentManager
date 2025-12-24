# Maintenance Department & Edit/Delete Feature

**Created:** 2024-12-24  
**Status:** 🔲 In Progress  
**Estimated Duration:** 2-3 hours

---

## Overview

Add department selection to maintenance notices and enable edit/delete functionality for published notices.

## Requirements

1. **Department Selection**: Add department dropdown to maintenance form
2. **Edit Functionality**: Allow editing existing maintenance notices
3. **Delete Functionality**: Allow deleting maintenance notices
4. **Data Model Update**: Add `departmentId` field to maintenance notices
5. **UI Updates**: Show department name in notice list and dashboard

## Implementation Phases

| Phase | Name | Status | Files |
| ----- | ---- | ------ | ----- |
| 1 | Data Model & Hook Updates | 🔲 Pending | [phase-01-data-model.md](./phase-01-data-model.md) |
| 2 | Form & UI Updates | 🔲 Pending | [phase-02-ui-updates.md](./phase-02-ui-updates.md) |
| 3 | Translations | 🔲 Pending | [phase-03-translations.md](./phase-03-translations.md) |

## Key Requirements

1. **Department Field**: Optional field, can be "All Departments" or specific department
2. **Edit Mode**: Click edit button to populate form with existing notice data
3. **Delete Confirmation**: Show confirmation dialog before deleting
4. **Backward Compatibility**: Existing notices without department should still work

## Technology Stack

- **Frontend**: Next.js 14, React, TypeScript
- **Storage**: localStorage (demo mode)
- **API**: Existing department API endpoint


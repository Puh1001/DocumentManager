# Phase 3: Translations

**Parent Plan:** [plan.md](./plan.md)  
**Status:** 🔲 Pending  
**Priority:** Medium

---

## Overview

Add translation keys for department field, edit/delete actions, and confirmation messages.

## Requirements

1. Department label and placeholder
2. Edit button text
3. Delete button text
4. Delete confirmation message
5. "All Departments" option text
6. Department display in notice list

## Translation Keys

```json
{
  "form": {
    "departmentLabel": "Department",
    "departmentPlaceholder": "Select department (optional)",
    "allDepartments": "All Departments"
  },
  "actions": {
    "edit": "Edit",
    "delete": "Delete",
    "save": "Save Changes",
    "cancel": "Cancel"
  },
  "deleteConfirm": {
    "title": "Delete Maintenance Notice",
    "message": "Are you sure you want to delete this notice?",
    "confirm": "Delete",
    "cancel": "Cancel"
  },
  "list": {
    "department": "Department",
    "allDepartments": "All Departments"
  }
}
```

## Related Files

- `apps/web/messages/en/maintenance.json`
- `apps/web/messages/vi/maintenance.json`
- `apps/web/messages/zh/maintenance.json`

## Implementation Steps

- [ ] Add department-related keys to all language files
- [ ] Add edit/delete action keys
- [ ] Add delete confirmation keys
- [ ] Test translations in UI

## Success Criteria

- All new UI text is translated
- Translations work in all 3 languages (en, vi, zh)


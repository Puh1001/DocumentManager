# Scout 01 – Codebase references for department folders & ISO upload

**Plan:** 20260203-0736-department-folders-auto-create-upload

## Backend

| Area              | File                                                            | Notes                                                                                   |
| ----------------- | --------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Folder structure  | apps/api/src/modules/storage/services/folder.service.ts         | ensureDepartmentFolderStructure(departmentId), getTree(departmentId?, includeInternal)  |
| Folder API        | apps/api/src/modules/storage/controllers/folder.controller.ts   | getTree(@Query departmentId), getTreeWithDocuments                                      |
| Department create | apps/api/src/modules/department/services/department.service.ts  | create() → ensureDepartmentFolderStructure(department.id)                               |
| Document upload   | apps/api/src/modules/storage/controllers/document.controller.ts | POST upload (folderId, levelId, file)                                                   |
| Document upload   | apps/api/src/modules/storage/services/document.service.ts       | upload(folderId, file, userId, …, options: userDepartmentIds, userCanUploadToAnyFolder) |
| Section names     | apps/api/src/modules/storage/utils/storage-path.util.ts         | StorageSection: KPI, ISO_documents, Maintenance, Delete_files                           |
| KPI ensure        | apps/api/src/modules/kpi/services/kpi-attachment.service.ts     | ensureDepartmentFolderStructure before KPI upload                                       |

## Frontend

| Area           | File                                                       | Notes                                                                                 |
| -------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Documents page | apps/web/src/app/[locale]/dashboard/documents/page.tsx     | uploadFolderDepartmentId, FolderPickerDialog, performUpload                           |
| Folder picker  | apps/web/src/components/documents/folder-picker-dialog.tsx | departmentId prop, GET /storage/folders/tree?departmentId=, LevelSelector, FolderTree |
| Folder tree    | apps/web/src/components/documents/folder-tree.tsx          | Renders folder list/tree                                                              |
| User depts     | apps/web/src/lib/kpi-access-helpers.ts                     | getUserDepartments(user), canSeeAllFolders(roles)                                     |

## Docs

- docs/codebase-summary.md – Storage module, folder/document flow
- docs/system-architecture.md – Storage, FolderService, ensureDepartmentFolderStructure refs
- plans/260130-1517-mandatory-storage-structure – Department folder auto-creation on create

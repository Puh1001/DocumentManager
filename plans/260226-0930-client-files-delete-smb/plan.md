## Overview

Fix client file deletion so that when a user deletes a file from the Client Files page, the corresponding physical files on the SMB share (current file and all versions) are also removed instead of only soft-deleting the database record.

## TODO

1. **Analyze current deletion flow for client files**
  - Trace `ClientController.delete` → `ClientService.delete` → `DocumentService.delete` and confirm behavior on SMB via `SmbService`.
2. **Design safe SMB deletion strategy for client files**
  - Decide how to remove the current file and any related version files on SMB while keeping database state consistent.
3. **Implement backend changes**
  - Extend `DocumentService` with a helper to delete a document's physical files from SMB (current file + versions, ignoring already-missing files).  
  - Update `ClientService.delete` to call this helper in addition to the existing soft-delete.
4. **Update and run tests**
  - Extend `client.service.spec.ts` to assert SMB deletion helper is called.  
  - Run targeted tests for the client module and ensure TypeScript builds without errors.
5. **Verify end-to-end behavior**
  - Manually delete a client file from the web UI and confirm both the UI row and corresponding files on SMB are removed as expected.


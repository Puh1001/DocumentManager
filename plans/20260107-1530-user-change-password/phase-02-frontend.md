# Phase 02 - Frontend UI & Integration (Change Password)

## Objectives

- Provide a simple Change Password screen for logged-in users in the dashboard.

## Tasks

1. **Routing & Metadata**
   - Add Change Password page under dashboard (e.g. `/dashboard/change-password` or under profile if exists).
   - Export `pageMetadata` with:
     - `module`: `"User"` or appropriate module name.
     - `action`: `"update"` (or similar) for permission checks.
   - Wrap page content in `PageGuard`.
2. **UI**
   - Form fields:
     - `currentPassword` (password input)
     - `newPassword` (password input)
     - `confirmNewPassword` (client-side only)
   - Use existing `Input`, `Label`, `Button`, and `useToast` utilities.
   - Disable submit while request in-flight, show loading state.
3. **API Integration**
   - Add `changePassword` method in `lib/api.ts` calling `POST /auth/change-password`.
   - Handle validation errors and display translated messages.
4. **Validation & UX**
   - Ensure `newPassword === confirmNewPassword` before sending request.
   - Enforce minimal length consistent with backend rules.
   - Show success toast and optionally clear form.



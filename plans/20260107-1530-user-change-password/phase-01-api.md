# Phase 01 - API Design & Implementation (Change Password)

## Objectives

- Add a secure `changePassword` flow for authenticated users in the Auth module.
- Reuse existing auth patterns (JWT, guards, error handling).

## Tasks

1. **DTOs**
   - Create `ChangePasswordDto` with:
     - `currentPassword` (string, required)
     - `newPassword` (string, required, min length aligned with existing password rules).
2. **Service**
   - Add `changePassword(userId, currentPassword, newPassword)` in `AuthService`:
     - Load user by `id` (include password hash).
     - Verify `currentPassword` with argon2.
     - On mismatch, throw appropriate `CustomException` + `ErrorCodes.AUTH`.
     - Hash and persist `newPassword`.
3. **Controller**
   - Add `POST /auth/change-password`:
     - Protect with `JwtAuthGuard`.
     - Use `ChangePasswordDto` body.
     - Use `req.user.id` for current user.
     - Return simple success payload `{ message: "Password changed successfully" }`.
4. **Error Codes**
   - Reuse or extend `ErrorCodes.AUTH` for invalid current password if needed.
5. **Tests**
   - Add/extend unit tests for `AuthService` and/or integration tests:
     - Success: correct current password updates hash.
     - Failure: wrong current password returns 401 with proper code.

# Phase 03 - Testing & Verification (Change Password)

## Objectives

- Ensure change password flow works end-to-end and is secure.

## Tasks

1. **Backend Tests**
   - Add/extend `AuthService` unit tests:
     - Success when current password is correct.
     - Throw unauthorized when current password is wrong.
   - If present, add integration test for `POST /auth/change-password`.
2. **Frontend Tests (Optional / Light)**
   - Smoke test for Change Password page rendering.
   - Basic form validation behavior (match confirm password).
3. **Manual QA Checklist**
   - Login as normal user.
   - Change password with:
     - Correct current password → can login with new password, old one fails.
     - Wrong current password → see error message, password unchanged.
   - Verify permission rules (only authenticated user, no admin-only guard).



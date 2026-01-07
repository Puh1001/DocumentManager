# User Self-Service Change Password

- **Goal**: Allow authenticated users to securely change their own password without admin support.
- **Scope**:
  - Backend: Add `changePassword` endpoint in Auth module using current password verification.
  - Frontend: Add Change Password page in dashboard for logged-in users.
  - Tests: Cover happy path and invalid credential scenarios.
- **Out of scope**:
  - Password reset via email / forgot-password flow.
  - Admin bulk password operations.

## Phases

1. API design & implementation (`phase-01-api.md`)
2. Frontend UI & integration (`phase-02-frontend.md`)
3. Testing & verification (`phase-03-testing.md`)

## Risks & Considerations

- Must verify current password to prevent hijacked session abuse.
- Ensure tokens/session behavior is consistent after password change (keep or invalidate sessions).
- Follow existing error handling and response patterns.



# Debug Report: Username Case Sensitivity & Soft Delete Issues

**Date:** 2025-01-22  
**Reporter:** User  
**Issue ID:** username-case-sensitivity-soft-delete

---

## Problem Summary

### Issue 1: Case Sensitivity Login Problem

User `V251754` (uppercase V) cannot login, but `v251754` (lowercase v) can login. Both users appear to be the same person but are treated as different users.

### Issue 2: Soft Delete Limitations

- Current delete operation only performs soft delete (sets `isActive: false`)
- No way to permanently delete users
- No dedicated endpoint to reactivate soft-deleted users

---

## Root Cause Analysis

### Issue 1: Case Sensitivity Mismatch

**5 Whys Analysis:**

1. **Why can't `V251754` login?** → Login searches for `v251754` (lowercase) but user is stored as `V251754` (uppercase)
2. **Why does login search lowercase?** → `auth.service.ts:24` uses `username.toLowerCase()` before querying
3. **Why is user stored as uppercase?** → `users.service.ts:34` stores username as-is without normalization
4. **Why isn't username normalized on creation?** → No normalization logic in user creation service
5. **Why are both users allowed?** → Existence check (`users.service.ts:19`) doesn't normalize, so `V251754` and `v251754` are treated as different

**Evidence:**

```22:24:apps/api/src/modules/auth/auth.service.ts
async validateUser(username: string, password: string) {
  const user = await (this.prisma as PrismaClientLike).user.findUnique({
    where: { username: username.toLowerCase() },
```

```15:34:apps/api/src/modules/users/users.service.ts
async create(dto: CreateUserDto) {
  // Check if username or email exists
  const existing = await (this.prisma as PrismaClientLike).user.findFirst({
    where: {
      OR: [{ username: dto.username }, { email: dto.email }],
    },
  });

  if (existing) {
    throw CustomException.conflict(
      ErrorCodes.USER.USERNAME_OR_EMAIL_EXISTS,
      "Username or email already exists"
    );
  }

  const passwordHash = await argon2.hash(dto.password);

  const user = await (this.prisma as PrismaClientLike).user.create({
    data: {
      username: dto.username,
```

**Impact:**

- Users can create accounts with different cases (e.g., `V251754` vs `v251754`)
- Login only works if username matches the lowercase version stored in DB
- Database allows duplicate usernames with different cases (violates uniqueness intent)

### Issue 2: Soft Delete Limitations

**Current Implementation:**

```176:178:apps/api/src/modules/users/users.service.ts
async deactivate(id: string) {
  return this.update(id, { isActive: false });
}
```

```56:61:apps/api/src/modules/users/users.controller.ts
@Delete(":id")
@CheckPolicies({ action: "manage", subject: "all" })
@ApiOperation({ summary: "Deactivate user (admin only)" })
async remove(@Param("id") id: string) {
  return this.usersService.deactivate(id);
}
```

**Problems:**

1. No hard delete functionality - users are only soft-deleted
2. No dedicated reactivate endpoint - must use PATCH with `isActive: true`
3. Soft-deleted users still occupy database space and may cause confusion

---

## Fix Plan

### Fix 1: Username Case Normalization

**Changes Required:**

1. Normalize username to lowercase in `users.service.ts`:
   - During user creation (`create` method)
   - During existence check (before checking for duplicates)
   - Normalize email to lowercase as well for consistency

**Files to Modify:**

- `apps/api/src/modules/users/users.service.ts`

### Fix 2: Hard Delete & Reactivate

**Changes Required:**

1. Add `hardDelete` method in `users.service.ts` to permanently delete user
2. Add `reactivate` method in `users.service.ts` to reactivate soft-deleted users
3. Add new endpoints in `users.controller.ts`:
   - `DELETE /users/:id/hard` - Hard delete user
   - `POST /users/:id/reactivate` - Reactivate user
4. Update frontend API client to support new endpoints

**Files to Modify:**

- `apps/api/src/modules/users/users.service.ts`
- `apps/api/src/modules/users/users.controller.ts`
- `apps/web/src/lib/api.ts`

---

## Implementation Notes

### Username Normalization

- Normalize both username and email to lowercase during creation
- Normalize in existence check to prevent case-sensitive duplicates
- Maintain backward compatibility - existing users will continue to work due to login normalization

### Hard Delete Considerations

- Hard delete should cascade delete related records (sessions, roles, etc.)
- Consider adding audit log before deletion
- May need to handle foreign key constraints

### Reactivate Endpoint

- Simple endpoint that sets `isActive: true`
- Can reuse existing `update` method with `isActive: true`

---

## Testing Checklist

- [ ] Create user with uppercase username - should be stored as lowercase
- [ ] Try to create duplicate user with different case - should be rejected
- [ ] Login with any case variation - should work
- [ ] Hard delete user - should permanently remove from database
- [ ] Reactivate soft-deleted user - should set isActive to true
- [ ] Verify cascade deletion works correctly

---

## Unresolved Questions

None at this time.

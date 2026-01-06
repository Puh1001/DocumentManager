# Plan: Case-Insensitive Login

**Created:** 2026-01-06 14:30  
**Status:** 🔄 In Progress  
**Priority:** P1 - High

---

## Overview

Make username login case-insensitive so users can log in with V210889, v210889, or any case combination.

## Current Issue

- `validateUser()` in AuthService uses exact match on username field
- Username stored in DB: `v210889` (lowercase)
- Login with `V210889` fails

## Solution

Update `validateUser()` to lowercase the input username before querying database.

## Implementation

### File to Modify

- `apps/api/src/modules/auth/auth.service.ts` - Add `.toLowerCase()` to username

### Changes

```typescript
async validateUser(username: string, password: string) {
  const user = await (this.prisma as PrismaClientLike).user.findUnique({
    where: { username: username.toLowerCase() }, // ← Add this
    include: {
      roles: {
        include: { role: true },
      },
    },
  });
  // ... rest unchanged
}
```

## Testing

Test login with:

1. `v210889` (lowercase) ✓
2. `V210889` (uppercase) ✓
3. `V210889` (mixed case) ✓

## Success Criteria

- [ ] Login works with any case combination
- [ ] Existing logins still work
- [ ] Tests pass

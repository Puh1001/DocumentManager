# Phase 2: Authentication & User Management

**Status:** 🟢 Completed  
**Priority:** P0 - Critical  
**Estimated Time:** 2-3 days

---

## Context

Xây dựng hệ thống xác thực với username/password, JWT tokens, và quản lý user cơ bản.
s
## Requirements

- [x] User registration (admin-only)
- [x] Login/Logout with JWT
- [x] Password hashing (Argon2)
- [x] Refresh token mechanism
- [x] Session management
- [x] User CRUD operations

## Database Schema

```prisma
model User {
  id            String    @id @default(uuid())
  username      String    @unique
  email         String    @unique
  passwordHash  String
  fullName      String
  department    String?
  isActive      Boolean   @default(true)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  lastLoginAt   DateTime?

  roles         UserRole[]
  sessions      Session[]
  documentVersions DocumentVersion[]
  auditLogs     AuditLog[]
}

model Role {
  id          String     @id @default(uuid())
  name        String     @unique
  description String?
  createdAt   DateTime   @default(now())

  users       UserRole[]
  permissions RolePermission[]
}

model UserRole {
  userId    String
  roleId    String
  assignedAt DateTime @default(now())

  user      User   @relation(fields: [userId], references: [id])
  role      Role   @relation(fields: [roleId], references: [id])

  @@id([userId, roleId])
}

model Session {
  id           String   @id @default(uuid())
  userId       String
  refreshToken String   @unique
  userAgent    String?
  ipAddress    String?
  expiresAt    DateTime
  createdAt    DateTime @default(now())

  user         User     @relation(fields: [userId], references: [id])
}
```

## API Endpoints

| Method | Endpoint        | Description                  |
| ------ | --------------- | ---------------------------- |
| POST   | `/auth/login`   | Login with username/password |
| POST   | `/auth/logout`  | Invalidate session           |
| POST   | `/auth/refresh` | Refresh access token         |
| GET    | `/auth/me`      | Get current user info        |
| GET    | `/users`        | List users (admin)           |
| POST   | `/users`        | Create user (admin)          |
| PATCH  | `/users/:id`    | Update user                  |
| DELETE | `/users/:id`    | Deactivate user              |

## Implementation Steps

### 2.1 Install Dependencies

```bash
cd apps/api
npm install @nestjs/passport @nestjs/jwt passport passport-jwt passport-local
npm install argon2
npm install class-validator class-transformer
```

### 2.2 Auth Module Structure

```
src/modules/auth/
├── auth.module.ts
├── auth.controller.ts
├── auth.service.ts
├── strategies/
│   ├── local.strategy.ts
│   └── jwt.strategy.ts
├── guards/
│   ├── jwt-auth.guard.ts
│   └── local-auth.guard.ts
└── dto/
    ├── login.dto.ts
    └── register.dto.ts
```

### 2.3 JWT Configuration

```typescript
// Access token: 15 minutes
// Refresh token: 7 days
// Rotation on refresh
```

### 2.4 Frontend Auth

- Login page with ShadcnUI form
- Auth context/provider
- Protected route wrapper
- Token storage in httpOnly cookie (preferred) or localStorage

## Todo List

- [x] Create Prisma schema for User, Role, Session
- [x] Implement AuthModule in NestJS
- [x] Setup Passport strategies (Local + JWT)
- [x] Create auth guards
- [x] Implement login/logout/refresh endpoints
- [x] Create UserModule for CRUD
- [x] Build login page in Next.js
- [x] Implement auth context in React
- [x] Add protected route HOC

## Success Criteria

- Users can login with username/password
- JWT tokens issued and validated
- Refresh token rotation works
- Protected routes require authentication
- Invalid tokens rejected

## Security Considerations

- Password hashed with Argon2id
- JWT secret from environment
- Refresh token stored securely
- Rate limiting on login attempts
- Audit log for auth events

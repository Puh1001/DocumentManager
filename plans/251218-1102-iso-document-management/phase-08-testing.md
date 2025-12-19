# Phase 8: Testing & Deployment

**Status:** 🔴 Pending  
**Priority:** P2 - Medium  
**Estimated Time:** 3-4 days

---

## Context

Comprehensive testing và chuẩn bị deployment cho production environment.

## Requirements

- [ ] Unit tests for services
- [ ] Integration tests for APIs
- [ ] E2E tests for critical flows
- [ ] Security testing
- [ ] Performance testing
- [ ] Docker deployment setup
- [ ] Environment configuration

## Testing Strategy

### Unit Tests (70%)

- Services logic
- Utility functions
- Guards and decorators
- Permission calculations

### Integration Tests (20%)

- API endpoints
- Database operations
- SMB operations

### E2E Tests (10%)

- Login flow
- Document upload flow
- Permission enforcement
- Version control flow

## Test Structure

```
apps/api/
├── src/
│   └── modules/
│       └── auth/
│           ├── auth.service.ts
│           └── auth.service.spec.ts    # Unit test
├── test/
│   ├── auth.e2e-spec.ts               # E2E test
│   └── jest-e2e.json

apps/web/
├── __tests__/
│   ├── components/                     # Component tests
│   └── integration/                    # Integration tests
└── cypress/
    └── e2e/                           # E2E tests
```

## Backend Tests

### Auth Service Unit Test

```typescript
// src/modules/auth/auth.service.spec.ts
describe("AuthService", () => {
  let service: AuthService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  describe("validateUser", () => {
    it("should return user if credentials valid", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      jest.spyOn(argon2, "verify").mockResolvedValue(true);

      const result = await service.validateUser("test", "password");
      expect(result).toEqual(mockUser);
    });

    it("should throw if user not found", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.validateUser("test", "password")).rejects.toThrow(
        UnauthorizedException
      );
    });
  });
});
```

### API E2E Test

```typescript
// test/auth.e2e-spec.ts
describe("Auth (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  describe("/auth/login (POST)", () => {
    it("should return tokens on valid credentials", () => {
      return request(app.getHttpServer())
        .post("/auth/login")
        .send({ username: "admin", password: "admin123" })
        .expect(200)
        .expect((res) => {
          expect(res.body.accessToken).toBeDefined();
          expect(res.body.refreshToken).toBeDefined();
        });
    });

    it("should return 401 on invalid credentials", () => {
      return request(app.getHttpServer())
        .post("/auth/login")
        .send({ username: "admin", password: "wrong" })
        .expect(401);
    });
  });
});
```

## Frontend Tests

### Component Test with Vitest

```typescript
// __tests__/components/LoginForm.test.tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { LoginForm } from "@/components/auth/LoginForm";

describe("LoginForm", () => {
  it("renders login form", () => {
    render(<LoginForm />);

    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /login/i })).toBeInTheDocument();
  });

  it("shows error on empty submit", async () => {
    render(<LoginForm />);

    fireEvent.click(screen.getByRole("button", { name: /login/i }));

    expect(await screen.findByText(/required/i)).toBeInTheDocument();
  });
});
```

### E2E with Cypress

```typescript
// cypress/e2e/login.cy.ts
describe("Login Flow", () => {
  it("allows user to login", () => {
    cy.visit("/login");

    cy.get('[data-testid="username"]').type("admin");
    cy.get('[data-testid="password"]').type("admin123");
    cy.get('[data-testid="submit"]').click();

    cy.url().should("include", "/dashboard");
    cy.contains("Welcome");
  });
});
```

## Security Testing Checklist

- [ ] SQL injection attempts blocked
- [ ] XSS payloads sanitized
- [ ] CSRF protection working
- [ ] Rate limiting enforced
- [ ] JWT validation strict
- [ ] Permission bypass attempts blocked
- [ ] File upload restrictions enforced

## Performance Testing

```bash
# Load testing with k6
k6 run --vus 50 --duration 30s load-test.js
```

```javascript
// load-test.js
import http from "k6/http";
import { check, sleep } from "k6";

export default function () {
  const res = http.get("http://localhost:3001/api/documents");
  check(res, { "status was 200": (r) => r.status === 200 });
  sleep(1);
}
```

## Deployment

### Docker Compose Production

```yaml
# docker-compose.prod.yml
version: "3.8"

services:
  web:
    build:
      context: .
      dockerfile: apps/web/Dockerfile
    environment:
      - NEXT_PUBLIC_API_URL=http://api:3001
    ports:
      - "3000:3000"

  api:
    build:
      context: .
      dockerfile: apps/api/Dockerfile
    environment:
      - DATABASE_URL=postgresql://user:pass@postgres:5432/documents
      - SMB_SHARE_PATH=\\\\192.168.1.x\\SharedFolder
    ports:
      - "3001:3001"

  postgres:
    image: postgres:16
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_DB=documents
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass

volumes:
  postgres_data:
```

### Environment Variables

```env
# .env.production
NODE_ENV=production
DATABASE_URL=postgresql://...
JWT_SECRET=super-secret-key-here
SMB_SHARE_PATH=\\192.168.1.x\SharedFolder
SMB_USERNAME=serviceaccount
SMB_PASSWORD=encrypted-password
```

## Todo List

- [ ] Setup Jest for NestJS
- [ ] Setup Vitest for Next.js
- [ ] Setup Cypress for E2E
- [ ] Write unit tests for auth service
- [ ] Write unit tests for storage service
- [ ] Write unit tests for permission service
- [ ] Write API integration tests
- [ ] Write frontend component tests
- [ ] Write E2E tests for critical flows
- [ ] Run security testing
- [ ] Run performance testing
- [ ] Create production Docker setup
- [ ] Document deployment process

## Success Criteria

- Test coverage > 80%
- All E2E tests passing
- No critical security vulnerabilities
- API response time < 200ms
- Docker deployment works
- Environment configs documented

## CI/CD Pipeline

```yaml
# .github/workflows/ci.yml
name: CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
      - run: npm ci
      - run: npm run test
      - run: npm run test:e2e

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: docker-compose -f docker-compose.prod.yml build
```

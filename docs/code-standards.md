# Code Standards

## General Principles

- **YAGNI**: You Aren't Gonna Need It - Don't over-engineer
- **KISS**: Keep It Simple, Stupid - Prefer simple solutions
- **DRY**: Don't Repeat Yourself - Extract common logic

## TypeScript

### Naming Conventions

- **Files**: `kebab-case.ts` (e.g., `auth-service.ts`)
- **Classes**: `PascalCase` (e.g., `AuthService`)
- **Functions**: `camelCase` (e.g., `validateUser`)
- **Constants**: `UPPER_SNAKE_CASE` (e.g., `JWT_SECRET`)
- **Interfaces**: `PascalCase` (e.g., `UserDto`)

### Type Safety

```typescript
// ✅ Good - explicit types
function getUser(id: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { id } });
}

// ❌ Bad - implicit any
function getUser(id) {
  return prisma.user.findUnique({ where: { id } });
}
```

## NestJS Backend

### Module Structure

```
src/modules/{feature}/
├── {feature}.module.ts
├── {feature}.controller.ts
├── {feature}.service.ts
├── dto/
│   ├── create-{feature}.dto.ts
│   └── update-{feature}.dto.ts
└── entities/
    └── {feature}.entity.ts
```

### Controllers

```typescript
@Controller('users')
@ApiTags('Users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'List all users' })
  findAll(@Query() query: QueryUsersDto) {
    return this.usersService.findAll(query);
  }
}
```

### Services

```typescript
@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryUsersDto) {
    // Business logic here
  }
}
```

### DTOs

```typescript
import { IsString, IsEmail, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ example: 'john.doe' })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  email: string;
}
```

## Next.js Frontend

### File Organization

```
src/
├── app/              # App Router pages
├── components/
│   ├── ui/          # Reusable UI components
│   └── {feature}/   # Feature-specific components
├── hooks/           # Custom hooks
└── lib/             # Utilities, API client
```

### Component Structure

```tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface MyComponentProps {
  title: string;
  onSubmit: () => void;
}

export function MyComponent({ title, onSubmit }: MyComponentProps) {
  const [loading, setLoading] = useState(false);

  return (
    <div className="p-4">
      <h1>{title}</h1>
      <Button onClick={onSubmit} disabled={loading}>
        Submit
      </Button>
    </div>
  );
}
```

### Hooks

```typescript
export function useDocument(id: string) {
  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/documents/${id}`)
      .then(setDocument)
      .finally(() => setLoading(false));
  }, [id]);

  return { document, loading };
}
```

## Styling

### Tailwind CSS

```tsx
// ✅ Good - consistent spacing, colors
<div className="p-4 bg-background text-foreground rounded-lg shadow">
  <h1 className="text-lg font-semibold">Title</h1>
</div>

// ❌ Bad - magic values
<div style={{ padding: '17px', backgroundColor: '#f5f5f5' }}>
```

### ShadcnUI Components

```tsx
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// Use variants
<Button variant="outline" size="sm">Click</Button>
<Button variant="destructive">Delete</Button>
```

## API Design

### REST Conventions

```
GET    /api/users          # List
GET    /api/users/:id      # Get one
POST   /api/users          # Create
PATCH  /api/users/:id      # Update
DELETE /api/users/:id      # Delete
```

### Response Format

```typescript
// Success
{
  "data": { ... },
  "message": "User created successfully"
}

// Error
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [...]
}

// Pagination
{
  "data": [...],
  "total": 100,
  "page": 1,
  "limit": 20,
  "totalPages": 5
}
```

## Error Handling

### Backend

```typescript
@Injectable()
export class UsersService {
  async findById(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    
    if (!user) {
      throw new NotFoundException('User not found');
    }
    
    return user;
  }
}
```

### Frontend

```typescript
try {
  const user = await api.get('/users/123');
} catch (error) {
  if (error.message === 'User not found') {
    // Handle not found
  }
  // Show error toast
}
```

## Testing

### Unit Tests

```typescript
describe('AuthService', () => {
  it('should validate user with correct password', async () => {
    const user = await service.validateUser('admin', 'admin123');
    expect(user).toBeDefined();
    expect(user.username).toBe('admin');
  });
});
```

## Git Conventions

### Commit Messages

```
feat: add document version history
fix: correct permission check for download
docs: update API documentation
refactor: extract SMB service
test: add auth service tests
chore: update dependencies
```

### Branch Naming

```
feature/document-viewer
fix/permission-bypass
refactor/storage-module
```


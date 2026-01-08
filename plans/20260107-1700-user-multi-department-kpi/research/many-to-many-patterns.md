# Many-to-Many Relationship Patterns

## Research Context

Best practices for implementing many-to-many relationships between Users and Departments with focus on performance, data integrity, and maintainability.

## Prisma Many-to-Many Patterns

### Explicit vs Implicit Relations

**Implicit (Simple):**

```prisma
model User {
  departments Department[]
}

model Department {
  users User[]
}
```

- Prisma auto-generates junction table
- No access to junction table metadata
- Not suitable when need assignment timestamps

**Explicit (Recommended for this project):**

```prisma
model User {
  departments UserDepartment[]
}

model Department {
  users UserDepartment[]
}

model UserDepartment {
  userId       String
  departmentId String
  assignedAt   DateTime @default(now())

  user       User       @relation(...)
  department Department @relation(...)

  @@id([userId, departmentId])
}
```

- Full control over junction table
- Can add metadata (assignedAt, assignedBy, etc.)
- Better for audit trails

## Database Design Best Practices

### Indexes

```sql
-- Composite primary key provides index for (userId, departmentId)
-- Add individual indexes for reverse lookups
CREATE INDEX idx_user_departments_user_id ON user_departments(user_id);
CREATE INDEX idx_user_departments_dept_id ON user_departments(department_id);
```

### Constraints

```sql
-- Cascade delete when user deleted
ON DELETE CASCADE

-- Prevent orphaned records
FOREIGN KEY constraints on both sides
```

### Performance Considerations

- Composite PK provides clustered index
- Query patterns:
  - Find user's departments: Index on userId
  - Find department's users: Index on departmentId
  - Check specific assignment: Composite PK

## Query Optimization

### N+1 Problem Prevention

```typescript
// Bad: N+1 queries
const users = await prisma.user.findMany();
for (const user of users) {
  const depts = await prisma.userDepartment.findMany({
    where: { userId: user.id },
  });
}

// Good: Single query with includes
const users = await prisma.user.findMany({
  include: {
    departments: {
      include: { department: true },
    },
  },
});
```

### Filtering by Multiple Departments

```typescript
// Find KPIs for user's departments
await prisma.kpiRecord.findMany({
  where: {
    departmentId: {
      in: user.departmentIds, // Array of department IDs
    },
  },
});
```

## Migration Strategy

### Backward Compatibility

1. **Phase 1:** Add new relation, keep old field
2. **Phase 2:** Dual-write to both old and new
3. **Phase 3:** Migrate existing data
4. **Phase 4:** Switch reads to new relation
5. **Phase 5:** Remove old field (future)

### Data Migration Script Pattern

```typescript
async function migrate() {
  const users = await prisma.user.findMany({
    where: { department: { not: null } },
  });

  for (const user of users) {
    const dept = await resolveDepartment(user.department);
    if (dept) {
      await prisma.userDepartment.upsert({
        where: {
          userId_departmentId: {
            userId: user.id,
            departmentId: dept.id,
          },
        },
        create: {
          userId: user.id,
          departmentId: dept.id,
        },
        update: {},
      });
    }
  }
}
```

## Authorization Patterns

### Check User Access to Department

```typescript
// Option 1: Query junction table
async function hasAccess(userId: string, deptId: string): boolean {
  const assignment = await prisma.userDepartment.findUnique({
    where: {
      userId_departmentId: { userId, departmentId: deptId },
    },
  });
  return !!assignment;
}

// Option 2: Cache in user object
interface UserWithDepts {
  userId: string;
  departmentIds: string[];
}

function hasAccess(user: UserWithDepts, deptId: string): boolean {
  return user.departmentIds.includes(deptId);
}
```

### Role-Based Overrides

```typescript
function checkDepartmentAccess(user: UserWithDepts, deptId: string): boolean {
  // Admin/Boss: full access
  if (user.isAdmin || user.isBoss) return true;

  // Regular users: check departments
  return user.departmentIds.includes(deptId);
}
```

## UI/UX Patterns

### Multi-Select Component

- Search/filter capability for many departments
- Selected items as removable badges
- Clear "Select All" / "Clear All" actions
- Keyboard navigation support

### Display Patterns

- **Compact:** Show first 2-3, then "+N more"
- **Expanded:** Show all with scroll
- **Tooltip:** Hover to see full list
- **Badge:** Color-coded by department type

### Department Switcher

- Dropdown showing all user's departments
- "All Departments" option to view combined
- Remember last selected (localStorage)

## Testing Strategies

### Unit Tests

- Assignment/removal operations
- Access checks with various scenarios
- Edge cases (no depts, many depts)

### Integration Tests

- Complete CRUD flows
- Authorization enforcement
- Data consistency

### Performance Tests

- Query time with 1, 5, 20, 50 departments
- Bulk assignment operations
- Concurrent access scenarios

## Common Pitfalls

1. **Forgetting to check full access roles**
   - Always check admin/boss first
2. **N+1 query problems**
   - Use `include` for related data
3. **Not handling empty department list**
   - Regular user with no departments should see empty state
4. **Inconsistent authorization checks**
   - Centralize access logic in service/guard
5. **Migration without rollback plan**
   - Always have reversal script ready

## Recommendations for This Project

1. ✅ Use explicit many-to-many with UserDepartment model
2. ✅ Keep legacy `department` field during migration
3. ✅ Add indexes on both userId and departmentId
4. ✅ Cache user's department IDs in request context
5. ✅ Use `IN` clause for filtering by multiple departments
6. ✅ Implement centralized access control helper
7. ✅ Add comprehensive tests for multi-dept scenarios
8. ✅ Document migration runbook thoroughly
9. 🔄 Consider adding "primary department" in future
10. 🔄 Monitor query performance post-deployment

# Researcher 01 Report: API Endpoint Design for Flat Document List

**Date:** 2026-01-30  
**Researcher:** Researcher 01  
**Topic:** API endpoint design for listing all documents with filters

## Current State

### Existing Endpoints
- `GET /storage/folders/:id` - Get folder with documents (filtered by status)
- `GET /storage/folders/tree` - Get folder tree structure
- `GET /storage/folders/tree/with-documents` - Get folder tree with documents
- `GET /storage/documents/:id` - Get single document
- `GET /storage/documents/search?q=...&folderId=...` - Search documents (optional folderId)

### Current Document Loading Flow
1. Frontend loads folder tree via `GET /storage/folders/tree?departmentId=...`
2. User selects folder
3. Frontend loads documents via `GET /storage/folders/:id?status=...`
4. Documents are filtered by folder and status

## Requirements

### New Endpoint Needed
- List ALL documents (not folder-specific)
- Support filters: Status, Department, Level (future)
- Include document metadata: folder info, department, version count
- Support pagination (optional, for performance)

## Solution Options

### Option A: New Dedicated Endpoint
**Endpoint:** `GET /storage/documents?status=...&departmentId=...&level=...`

**Pros:**
- Clear separation of concerns
- Easy to extend with pagination, sorting
- RESTful design
- Can reuse existing DocumentService methods

**Cons:**
- New endpoint to maintain
- Need to add service method

**Implementation:**
```typescript
// document.controller.ts
@Get()
@ApiOperation({ summary: "List all documents with filters" })
async findAll(
  @Query("status") status?: string,
  @Query("departmentId") departmentId?: string,
  @Query("level") level?: string,
) {
  return this.documentService.findAll({ status, departmentId, level });
}

// document.service.ts
async findAll(filters: {
  status?: string;
  departmentId?: string;
  level?: string;
}) {
  const where: Prisma.DocumentWhereInput = {};
  
  if (filters.status) {
    where.status = filters.status as DocumentStatus;
  }
  
  if (filters.departmentId) {
    where.folder = { departmentId: filters.departmentId };
  }
  
  // Level filter (future - when schema extended)
  
  return this.prisma.document.findMany({
    where,
    include: {
      folder: {
        include: {
          department: {
            select: { id: true, name: true, code: true }
          }
        }
      },
      _count: { select: { versions: true } }
    },
    orderBy: { name: "asc" }
  });
}
```

### Option B: Extend Search Endpoint
**Endpoint:** `GET /storage/documents/search?status=...&departmentId=...&level=...`

**Pros:**
- Reuse existing endpoint
- Less code changes

**Cons:**
- Mixes search and filtering concerns
- Less RESTful
- Current search is text-based, filters are different

**Verdict:** Option A is better - cleaner separation, more maintainable.

## Data Structure

### Response Format
```typescript
interface DocumentListItem {
  id: string;
  name: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  updatedAt: string;
  status: "ACTIVE" | "ARCHIVED" | "DELETED";
  folder: {
    id: string;
    name: string;
    path: string;
    department?: {
      id: string;
      name: string;
      code: string;
    } | null;
  };
  _count: {
    versions: number;
  };
}
```

## Performance Considerations

- **No pagination initially:** Load all documents (YAGNI)
- **Add pagination later** if performance issues arise
- **Indexes:** Ensure `status`, `folderId`, `folder.departmentId` are indexed
- **Query optimization:** Use `select` to limit fields if needed

## Security Considerations

- Apply permission checks (RBAC/ABAC)
- Filter by user's accessible folders/departments
- Respect document-level permissions

## Recommendations

1. Create new `GET /storage/documents` endpoint
2. Add `findAll` method to DocumentService
3. Include folder and department info in response
4. Support status and departmentId filters
5. Level filter placeholder (for future schema extension)

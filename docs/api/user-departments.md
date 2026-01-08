# User Department Management API

**Base Path:** `/api/users/:id/departments`

## Overview

Endpoints for managing user-department assignments. Enables assigning multiple departments to users for multi-department KPI access.

## Endpoints

### Get User's Departments

**GET** `/api/users/:id/departments`

Get all departments assigned to a user.

**Authentication:** Required (Admin only)

**Path Parameters:**
- `id` (string, required) - User ID

**Response:**
```json
[
  {
    "id": "dept-1",
    "name": "Human Resources",
    "code": "HR",
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  },
  {
    "id": "dept-2",
    "name": "Information Technology",
    "code": "IT",
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
]
```

**Status Codes:**
- `200 OK` - Success
- `401 Unauthorized` - Not authenticated
- `403 Forbidden` - Not admin
- `404 Not Found` - User not found

---

### Assign Departments to User

**POST** `/api/users/:id/departments`

Assign multiple departments to a user. Replaces existing assignments.

**Authentication:** Required (Admin only)

**Path Parameters:**
- `id` (string, required) - User ID

**Request Body:**
```json
{
  "departmentIds": ["dept-1", "dept-2", "dept-3"]
}
```

**Request Body Schema:**
- `departmentIds` (string[], required, min: 1) - Array of department IDs

**Response:**
```json
{
  "message": "Departments assigned successfully"
}
```

**Status Codes:**
- `200 OK` - Success
- `400 Bad Request` - Invalid department IDs
- `401 Unauthorized` - Not authenticated
- `403 Forbidden` - Not admin
- `404 Not Found` - User or department not found

**Error Responses:**
```json
{
  "statusCode": 400,
  "message": "Departments not found: dept-invalid",
  "errorCode": "department.not_found"
}
```

---

### Remove Department from User

**DELETE** `/api/users/:id/departments/:departmentId`

Remove a specific department assignment from a user.

**Authentication:** Required (Admin only)

**Path Parameters:**
- `id` (string, required) - User ID
- `departmentId` (string, required) - Department ID to remove

**Response:**
```json
{
  "message": "Department removed successfully"
}
```

**Status Codes:**
- `200 OK` - Success
- `401 Unauthorized` - Not authenticated
- `403 Forbidden` - Not admin
- `404 Not Found` - User, department, or assignment not found

**Error Responses:**
```json
{
  "statusCode": 404,
  "message": "User is not assigned to this department",
  "errorCode": "department.not_assigned"
}
```

## Examples

### Assign Multiple Departments

```bash
curl -X POST "https://api.example.com/api/users/user-123/departments" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "departmentIds": ["dept-hr", "dept-it", "dept-finance"]
  }'
```

### Get User's Departments

```bash
curl -X GET "https://api.example.com/api/users/user-123/departments" \
  -H "Authorization: Bearer <token>"
```

### Remove Department

```bash
curl -X DELETE "https://api.example.com/api/users/user-123/departments/dept-it" \
  -H "Authorization: Bearer <token>"
```

## Multi-Department KPI Access

When a user is assigned to multiple departments:

1. **KPI Queries** (`GET /api/kpi/records`) automatically return KPIs from **all** user's departments
2. **KPI Filtering** - User can filter by any of their assigned departments
3. **KPI Creation** - User can create KPIs for any of their assigned departments
4. **Access Control** - User cannot access KPIs from unassigned departments

### Example: Multi-Department KPI Query

```bash
# User assigned to: HR, IT, Finance
# Query returns KPIs from all three departments
curl -X GET "https://api.example.com/api/kpi/records?year=2024" \
  -H "Authorization: Bearer <token>"

# Filter by specific department (user must have access)
curl -X GET "https://api.example.com/api/kpi/records?year=2024&departmentId=dept-hr" \
  -H "Authorization: Bearer <token>"
```

## Notes

- **Admin/Boss Roles:** Have full access to all departments regardless of assignments
- **Legacy Support:** `User.department` field still exists for backward compatibility
- **Idempotent:** Assigning same department multiple times is safe (uses upsert)
- **Cascade Delete:** Removing user or department automatically removes assignments


# 🔐 Roles API Documentation - LIPU MMS

Complete API reference for managing roles in the LIPU Material Management System.

**Version**: 1.0.0  
**Base URL**: `http://localhost:8000/api`  
**Authentication**: Sanctum (Bearer Token)

---

## 📑 Table of Contents

1. [Introduction](#1-introduction)
2. [Authentication](#2-authentication)
3. [LIPU Roles Overview](#3-lipu-roles-overview)
4. [Endpoints](#4-endpoints)
   - [4.1 List Roles](#41-list-roles)
   - [4.2 Get Role](#42-get-role)
   - [4.3 Create Role](#43-create-role)
   - [4.4 Update Role](#44-update-role)
   - [4.5 Delete Role](#45-delete-role)
   - [4.6 Assign Permissions](#46-assign-permissions)
   - [4.7 Assign to Users](#47-assign-to-users)
5. [Error Handling](#5-error-handling)
6. [Best Practices](#6-best-practices)
7. [Examples](#7-examples)

---

## 1. Introduction

The Roles API allows you to manage roles and permissions in the LIPU system. Roles define what actions users can perform within the application.

### LIPU-Specific Roles

LIPU MMS includes 4 predefined roles:
- **LIPU Administrator**: Full system access
- **Plant Operator**: Plant equipment operations
- **Fleet Supervisor**: Fleet and driver management
- **Data Analyst**: Read-only reporting access

---

## 2. Authentication

All API requests require authentication using Sanctum bearer tokens.

### Headers Required

```http
Authorization: Bearer {your-token}
Accept: application/json
Content-Type: application/json
```

### Get Authentication Token

```bash
curl -X POST http://localhost:8000/api/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@lipu.com",
    "password": "password"
  }'
```

**Response:**
```json
{
  "token": "1|abcdef123456...",
  "user": {
    "id": "uuid",
    "email": "admin@lipu.com"
  }
}
```

---

## 3. LIPU Roles Overview

### Role Structure

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Unique identifier |
| `name` | string | Role name |
| `guard_name` | string | Guard type (sanctum) |
| `description` | string | Role description |
| `service` | string | Service identifier (lipu-mms) |
| `company_uuid` | UUID | Associated company |
| `is_mutable` | boolean | Can be edited |
| `is_deletable` | boolean | Can be deleted |
| `created_at` | timestamp | Creation date |
| `updated_at` | timestamp | Last update date |

### LIPU Roles Matrix

| Role | Create | Read | Update | Delete | Manage Users |
|------|--------|------|--------|--------|--------------|
| LIPU Administrator | ✅ | ✅ | ✅ | ✅ | ✅ |
| Plant Operator | ✅ | ✅ | ✅ | ❌ | ❌ |
| Fleet Supervisor | ✅ | ✅ | ✅ | ⚠️ Limited | ❌ |
| Data Analyst | ❌ | ✅ | ❌ | ❌ | ❌ |

---

## 4. Endpoints

### 4.1 List Roles

Retrieve a paginated list of roles.

**Endpoint:** `GET /api/roles`

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | integer | No | Page number (default: 1) |
| `limit` | integer | No | Items per page (default: 15) |
| `sort` | string | No | Field to sort by |
| `order` | string | No | Sort order (asc/desc) |
| `query` | string | No | Search query |
| `service` | string | No | Filter by service (e.g., lipu-mms) |
| `guard_name` | string | No | Filter by guard |
| `company_uuid` | UUID | No | Filter by company |

#### Example Request

```bash
curl -X GET "http://localhost:8000/api/roles?service=lipu-mms&limit=10" \
  -H "Authorization: Bearer {token}" \
  -H "Accept: application/json"
```

#### Success Response (200 OK)

```json
{
  "data": [
    {
      "id": "c349e7dd-5659-447d-bcce-0345797242f1",
      "name": "LIPU Administrator",
      "guard_name": "sanctum",
      "description": "Full system administrator with complete access",
      "service": "lipu-mms",
      "company_uuid": null,
      "is_mutable": false,
      "is_deletable": false,
      "created_at": "2025-11-20T10:00:00Z",
      "updated_at": "2025-11-20T10:00:00Z"
    },
    {
      "id": "d8f3a9bc-1234-5678-abcd-123456789abc",
      "name": "Plant Operator",
      "guard_name": "sanctum",
      "description": "Operates plant equipment and records production",
      "service": "lipu-mms",
      "company_uuid": null,
      "is_mutable": true,
      "is_deletable": true,
      "created_at": "2025-11-20T10:00:00Z",
      "updated_at": "2025-11-20T10:00:00Z"
    }
  ],
  "meta": {
    "current_page": 1,
    "total": 4,
    "per_page": 10,
    "last_page": 1
  },
  "links": {
    "first": "/api/roles?page=1",
    "last": "/api/roles?page=1",
    "prev": null,
    "next": null
  }
}
```

---

### 4.2 Get Role

Retrieve a specific role by ID.

**Endpoint:** `GET /api/roles/{id}`

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | UUID | Yes | Role ID |

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `with[]` | array | No | Include relationships (permissions, users) |

#### Example Request

```bash
curl -X GET "http://localhost:8000/api/roles/c349e7dd-5659-447d-bcce-0345797242f1?with[]=permissions&with[]=users" \
  -H "Authorization: Bearer {token}" \
  -H "Accept: application/json"
```

#### Success Response (200 OK)

```json
{
  "data": {
    "id": "c349e7dd-5659-447d-bcce-0345797242f1",
    "name": "LIPU Administrator",
    "guard_name": "sanctum",
    "description": "Full system administrator with complete access",
    "service": "lipu-mms",
    "company_uuid": null,
    "is_mutable": false,
    "is_deletable": false,
    "permissions": [
      {
        "id": 1,
        "name": "view users",
        "guard_name": "sanctum"
      },
      {
        "id": 2,
        "name": "create users",
        "guard_name": "sanctum"
      }
    ],
    "users_count": 5,
    "created_at": "2025-11-20T10:00:00Z",
    "updated_at": "2025-11-20T10:00:00Z"
  }
}
```

#### Error Response (404 Not Found)

```json
{
  "error": "Role not found",
  "message": "The requested role does not exist",
  "status_code": 404
}
```

---

### 4.3 Create Role

Create a new role.

**Endpoint:** `POST /api/roles`

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Role name (max 255 chars) |
| `guard_name` | string | Yes | Guard type (sanctum/web) |
| `description` | string | No | Role description (max 1000 chars) |
| `service` | string | No | Service identifier |
| `company_uuid` | UUID | No | Associated company |
| `permissions` | array | No | Permission IDs to assign |

#### Example Request

```bash
curl -X POST "http://localhost:8000/api/roles" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "name": "Warehouse Manager",
    "guard_name": "sanctum",
    "description": "Manages warehouse operations and inventory",
    "service": "lipu-mms",
    "permissions": [1, 5, 10, 15]
  }'
```

#### Success Response (201 Created)

```json
{
  "data": {
    "id": "new-uuid-here",
    "name": "Warehouse Manager",
    "guard_name": "sanctum",
    "description": "Manages warehouse operations and inventory",
    "service": "lipu-mms",
    "company_uuid": null,
    "is_mutable": true,
    "is_deletable": true,
    "permissions": [
      {
        "id": 1,
        "name": "view inventory"
      }
    ],
    "created_at": "2025-11-20T12:00:00Z",
    "updated_at": "2025-11-20T12:00:00Z"
  },
  "message": "Role created successfully"
}
```

#### Error Response (422 Validation Error)

```json
{
  "error": "Validation failed",
  "message": "The given data was invalid",
  "errors": {
    "name": [
      "The name has already been taken for this guard"
    ],
    "guard_name": [
      "The guard name must be either 'sanctum' or 'web'"
    ]
  },
  "status_code": 422
}
```

---

### 4.4 Update Role

Update an existing role.

**Endpoint:** `PUT /api/roles/{id}` or `PATCH /api/roles/{id}`

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | UUID | Yes | Role ID |

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | No | Role name |
| `description` | string | No | Role description |
| `permissions` | array | No | Permission IDs |

#### Example Request

```bash
curl -X PUT "http://localhost:8000/api/roles/new-uuid-here" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "description": "Updated description for warehouse manager role",
    "permissions": [1, 5, 10, 15, 20]
  }'
```

#### Success Response (200 OK)

```json
{
  "data": {
    "id": "new-uuid-here",
    "name": "Warehouse Manager",
    "guard_name": "sanctum",
    "description": "Updated description for warehouse manager role",
    "service": "lipu-mms",
    "permissions": [
      {
        "id": 1,
        "name": "view inventory"
      }
    ],
    "updated_at": "2025-11-20T14:00:00Z"
  },
  "message": "Role updated successfully"
}
```

#### Error Response (403 Forbidden)

```json
{
  "error": "Forbidden",
  "message": "Cannot modify protected role. Role is marked as not mutable.",
  "status_code": 403
}
```

---

### 4.5 Delete Role

Delete a role (soft delete).

**Endpoint:** `DELETE /api/roles/{id}`

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | UUID | Yes | Role ID |

#### Example Request

```bash
curl -X DELETE "http://localhost:8000/api/roles/new-uuid-here" \
  -H "Authorization: Bearer {token}" \
  -H "Accept: application/json"
```

#### Success Response (200 OK)

```json
{
  "message": "Role deleted successfully",
  "data": {
    "id": "new-uuid-here",
    "deleted_at": "2025-11-20T15:00:00Z"
  }
}
```

#### Error Response (403 Forbidden)

```json
{
  "error": "Forbidden",
  "message": "Cannot delete protected role. Role is marked as not deletable.",
  "status_code": 403
}
```

#### Error Response (409 Conflict)

```json
{
  "error": "Conflict",
  "message": "Cannot delete role. There are 15 users currently assigned to this role.",
  "status_code": 409,
  "details": {
    "users_count": 15
  }
}
```

---

### 4.6 Assign Permissions

Assign or sync permissions to a role.

**Endpoint:** `POST /api/roles/{id}/assign-permissions`

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | UUID | Yes | Role ID |

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `permissions` | array | Yes | Permission IDs |
| `operation` | string | No | Operation type: sync, attach, detach (default: sync) |

#### Example Request (Sync)

```bash
curl -X POST "http://localhost:8000/api/roles/new-uuid-here/assign-permissions" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "permissions": [1, 2, 3, 5, 10],
    "operation": "sync"
  }'
```

#### Example Request (Attach)

```bash
curl -X POST "http://localhost:8000/api/roles/new-uuid-here/assign-permissions" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "permissions": [15, 20],
    "operation": "attach"
  }'
```

#### Success Response (200 OK)

```json
{
  "message": "Permissions assigned successfully",
  "data": {
    "role_id": "new-uuid-here",
    "permissions_count": 7,
    "permissions": [
      {
        "id": 1,
        "name": "view users"
      },
      {
        "id": 2,
        "name": "create users"
      }
    ]
  }
}
```

---

### 4.7 Assign to Users

Assign a role to multiple users.

**Endpoint:** `POST /api/roles/{id}/assign-users`

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | UUID | Yes | Role ID |

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `users` | array | Yes | User UUIDs |

#### Example Request

```bash
curl -X POST "http://localhost:8000/api/roles/new-uuid-here/assign-users" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "users": [
      "user-uuid-1",
      "user-uuid-2",
      "user-uuid-3"
    ]
  }'
```

#### Success Response (200 OK)

```json
{
  "message": "Role assigned to users successfully",
  "data": {
    "role_id": "new-uuid-here",
    "users_assigned": 3,
    "users": [
      {
        "uuid": "user-uuid-1",
        "name": "John Doe",
        "email": "john@lipu.com"
      },
      {
        "uuid": "user-uuid-2",
        "name": "Jane Smith",
        "email": "jane@lipu.com"
      },
      {
        "uuid": "user-uuid-3",
        "name": "Bob Johnson",
        "email": "bob@lipu.com"
      }
    ]
  }
}
```

#### Error Response (422 Validation Error)

```json
{
  "error": "Validation failed",
  "message": "Some users are invalid or inactive",
  "errors": {
    "users.0": [
      "User with UUID 'user-uuid-1' does not exist"
    ]
  },
  "status_code": 422
}
```

---

## 5. Error Handling

### HTTP Status Codes

| Code | Meaning | Description |
|------|---------|-------------|
| 200 | OK | Request successful |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Invalid request format |
| 401 | Unauthorized | Missing or invalid authentication |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Resource conflict (e.g., cannot delete) |
| 422 | Validation Error | Invalid data provided |
| 500 | Internal Server Error | Server error |

### Error Response Format

```json
{
  "error": "Error type",
  "message": "Human-readable error message",
  "errors": {
    "field": ["Specific validation error"]
  },
  "status_code": 422,
  "details": {}
}
```

### Common Errors

#### 401 Unauthorized
```json
{
  "error": "Unauthorized",
  "message": "Unauthenticated",
  "status_code": 401
}
```

**Solution**: Include valid Bearer token in Authorization header

#### 403 Forbidden
```json
{
  "error": "Forbidden",
  "message": "You do not have permission to perform this action",
  "status_code": 403
}
```

**Solution**: User needs `manage roles` permission

#### 422 Validation Error
```json
{
  "error": "Validation failed",
  "message": "The given data was invalid",
  "errors": {
    "name": [
      "The name field is required"
    ]
  },
  "status_code": 422
}
```

**Solution**: Fix validation errors listed in `errors` object

---

## 6. Best Practices

### 1. Use Service Filter for LIPU Roles

Always filter by `service=lipu-mms` when querying LIPU-specific roles:

```bash
GET /api/roles?service=lipu-mms
```

### 2. Check Mutability Before Updates

Before updating a role, check `is_mutable` field:

```javascript
if (role.is_mutable === false) {
  console.error('Cannot modify protected role');
  return;
}
```

### 3. Check Deletability Before Deletion

Before deleting a role, check `is_deletable` field and `users_count`:

```javascript
if (role.is_deletable === false) {
  console.error('Cannot delete protected role');
  return;
}

if (role.users_count > 0) {
  console.warn(`Role has ${role.users_count} users assigned`);
  // Prompt user for confirmation
}
```

### 4. Use Sync for Full Permission Updates

Use `operation: "sync"` to replace all permissions:

```json
{
  "permissions": [1, 2, 3],
  "operation": "sync"
}
```

Use `operation: "attach"` to add permissions without removing existing ones.

### 5. Pagination for Large Lists

Always use pagination when fetching roles:

```bash
GET /api/roles?page=1&limit=15
```

### 6. Include Relationships Selectively

Only request relationships you need:

```bash
# Good
GET /api/roles/{id}?with[]=permissions

# Avoid (unless needed)
GET /api/roles/{id}?with[]=permissions&with[]=users
```

### 7. Error Handling

Always handle errors gracefully:

```javascript
try {
  const response = await fetch('/api/roles', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    }
  });
  
  if (!response.ok) {
    const error = await response.json();
    console.error('API Error:', error.message);
    // Handle specific error codes
    if (response.status === 401) {
      // Redirect to login
    }
  }
  
  const data = await response.json();
  // Process data
} catch (error) {
  console.error('Network error:', error);
}
```

### 8. Rate Limiting

Respect rate limits (60 requests/minute per user). Implement exponential backoff for retries.

### 9. Caching

Cache role data when appropriate (TTL: 5 minutes):

```javascript
const cacheKey = `role:${roleId}`;
const cachedRole = cache.get(cacheKey);

if (cachedRole) {
  return cachedRole;
}

const role = await fetchRole(roleId);
cache.set(cacheKey, role, 300); // 5 minutes
return role;
```

### 10. Multi-Tenancy

Always scope roles by company when applicable:

```bash
GET /api/roles?company_uuid={company-id}&service=lipu-mms
```

---

## 7. Examples

### Example 1: Get All LIPU Roles

```bash
curl -X GET "http://localhost:8000/api/roles?service=lipu-mms" \
  -H "Authorization: Bearer 1|abcdef123456" \
  -H "Accept: application/json"
```

### Example 2: Create Custom LIPU Role

```bash
curl -X POST "http://localhost:8000/api/roles" \
  -H "Authorization: Bearer 1|abcdef123456" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "name": "Quality Control Inspector",
    "guard_name": "sanctum",
    "description": "Inspects product quality and compliance",
    "service": "lipu-mms",
    "permissions": [10, 11, 12]
  }'
```

### Example 3: Assign LIPU Administrator to User

```bash
# Step 1: Get LIPU Administrator role ID
curl -X GET "http://localhost:8000/api/roles?service=lipu-mms&query=LIPU%20Administrator" \
  -H "Authorization: Bearer 1|abcdef123456" \
  -H "Accept: application/json"

# Step 2: Assign role to user
curl -X POST "http://localhost:8000/api/roles/c349e7dd-5659-447d-bcce-0345797242f1/assign-users" \
  -H "Authorization: Bearer 1|abcdef123456" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "users": ["user-uuid-here"]
  }'
```

### Example 4: Update Role Permissions

```bash
curl -X POST "http://localhost:8000/api/roles/role-uuid/assign-permissions" \
  -H "Authorization: Bearer 1|abcdef123456" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "permissions": [1, 2, 3, 5, 8, 10, 15, 20],
    "operation": "sync"
  }'
```

### Example 5: Delete Custom Role

```bash
curl -X DELETE "http://localhost:8000/api/roles/custom-role-uuid" \
  -H "Authorization: Bearer 1|abcdef123456" \
  -H "Accept: application/json"
```

### Example 6: JavaScript/Fetch Integration

```javascript
async function createLipuRole(roleName, description, permissions) {
  const token = localStorage.getItem('auth_token');
  
  try {
    const response = await fetch('http://localhost:8000/api/roles', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        name: roleName,
        guard_name: 'sanctum',
        description: description,
        service: 'lipu-mms',
        permissions: permissions
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }
    
    const data = await response.json();
    console.log('Role created:', data.data);
    return data.data;
    
  } catch (error) {
    console.error('Failed to create role:', error);
    throw error;
  }
}

// Usage
createLipuRole(
  'Maintenance Technician',
  'Maintains equipment and machinery',
  [5, 6, 7, 10]
);
```

### Example 7: Python Integration

```python
import requests

class LipuRolesAPI:
    def __init__(self, base_url, token):
        self.base_url = base_url
        self.headers = {
            'Authorization': f'Bearer {token}',
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        }
    
    def list_lipu_roles(self):
        """Get all LIPU roles"""
        response = requests.get(
            f'{self.base_url}/roles',
            headers=self.headers,
            params={'service': 'lipu-mms'}
        )
        response.raise_for_status()
        return response.json()['data']
    
    def create_role(self, name, description, permissions):
        """Create a new LIPU role"""
        payload = {
            'name': name,
            'guard_name': 'sanctum',
            'description': description,
            'service': 'lipu-mms',
            'permissions': permissions
        }
        response = requests.post(
            f'{self.base_url}/roles',
            headers=self.headers,
            json=payload
        )
        response.raise_for_status()
        return response.json()['data']
    
    def assign_to_users(self, role_id, user_uuids):
        """Assign role to multiple users"""
        payload = {'users': user_uuids}
        response = requests.post(
            f'{self.base_url}/roles/{role_id}/assign-users',
            headers=self.headers,
            json=payload
        )
        response.raise_for_status()
        return response.json()

# Usage
api = LipuRolesAPI('http://localhost:8000/api', 'your-token-here')
roles = api.list_lipu_roles()
print(f'Found {len(roles)} LIPU roles')
```

---

## 📚 Related Documentation

- [LIPU Roles Overview](../ROLES_LIPU.md)
- [Tests Documentation](../../tests/README_LIPU_TESTS.md)
- [Postman Collection](../../../postman/roles-api.json)

---

## 🔄 Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-11-20 | Initial API documentation |

---

## 📧 Support

For issues or questions:
- **JIRA Ticket**: LIPU-91
- **Documentation**: See related docs above
- **Testing**: Run test suite in `api/tests/`

---

**Last Updated**: 2025-11-20  
**Status**: ✅ Complete


# 📚 LIPU API Documentation

Complete API documentation for the LIPU Material Management System.

---

## 🗂️ Available Documentation

### Roles API
- **File**: [roles-api.md](./roles-api.md)
- **Postman Collection**: [../../postman/roles-api.json](../../postman/roles-api.json)
- **Description**: Complete reference for role management endpoints

---

## 🚀 Quick Start

### 1. Import Postman Collection

```bash
# Location
postman/roles-api.json
```

**Import Steps:**
1. Open Postman
2. Click **Import** button
3. Select `postman/roles-api.json`
4. Collection will be imported with all endpoints

### 2. Configure Environment

The collection includes default variables:
- `base_url`: http://localhost:8000/api
- `auth_token`: (auto-populated on login)
- `role_id`: (auto-populated on role creation)

**Optional**: Create a Postman environment for multiple configurations (dev, staging, prod).

### 3. Authenticate

1. Run **Auth > Login** request
2. Token is automatically saved
3. All subsequent requests use this token

---

## 📖 Documentation Structure

```
api/docs/
├── api/
│   ├── README.md              ← You are here
│   └── roles-api.md           ← Roles API reference
├── ROLES_LIPU.md              ← LIPU roles overview
└── (future API docs)

postman/
└── roles-api.json             ← Postman collection

api/tests/
├── Feature/
│   └── LipuRolesTest.php      ← Integration tests
├── Unit/
│   └── LipuRolesSeederTest.php ← Unit tests
└── README_LIPU_TESTS.md       ← Testing guide
```

---

## 🔑 Authentication

All API endpoints (except `/login`) require authentication.

### Get Token

```bash
curl -X POST http://localhost:8000/api/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@lipu.com",
    "password": "password"
  }'
```

### Use Token

```bash
curl -X GET http://localhost:8000/api/roles \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Accept: application/json"
```

---

## 📋 Available APIs

| API | Status | Documentation | Version |
|-----|--------|---------------|---------|
| **Roles** | ✅ Live | [roles-api.md](./roles-api.md) | 1.0.0 |
| Users | 🚧 Planned | TBD | - |
| Permissions | 🚧 Planned | TBD | - |
| Plants | 🚧 Planned | TBD | - |
| Fleet | 🚧 Planned | TBD | - |
| Analytics | 🚧 Planned | TBD | - |

---

## 🛠️ Tools & Integrations

### Postman

**Import Collection:**
1. File → Import → Select `postman/roles-api.json`
2. Run **Login** request to authenticate
3. Explore endpoints

**Features:**
- Auto-save authentication token
- Pre-request scripts for timestamps
- Response validation
- Example requests for all endpoints

### cURL

All endpoints include cURL examples in documentation.

**Example:**
```bash
curl -X GET "http://localhost:8000/api/roles?service=lipu-mms" \
  -H "Authorization: Bearer {token}" \
  -H "Accept: application/json"
```

### JavaScript/Fetch

```javascript
const response = await fetch('http://localhost:8000/api/roles', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/json'
  }
});
const data = await response.json();
```

### Python/Requests

```python
import requests

response = requests.get(
    'http://localhost:8000/api/roles',
    headers={
        'Authorization': f'Bearer {token}',
        'Accept': 'application/json'
    }
)
data = response.json()
```

---

## ⚠️ Error Handling

All APIs follow a consistent error format:

```json
{
  "error": "Error type",
  "message": "Human-readable message",
  "status_code": 422,
  "errors": {
    "field": ["Validation error"]
  }
}
```

### Common Status Codes

| Code | Meaning | Action |
|------|---------|--------|
| 200 | Success | Request completed |
| 201 | Created | Resource created |
| 400 | Bad Request | Check request format |
| 401 | Unauthorized | Login again |
| 403 | Forbidden | Check permissions |
| 404 | Not Found | Resource doesn't exist |
| 422 | Validation Error | Fix validation errors |
| 500 | Server Error | Contact support |

---

## 🧪 Testing

Run API tests:

```bash
# All tests
docker compose exec application ./vendor/bin/phpunit

# Specific test suite
docker compose exec application ./vendor/bin/phpunit --testsuite Feature

# Specific test file
docker compose exec application ./vendor/bin/phpunit tests/Feature/LipuRolesTest.php
```

See [Testing Documentation](../../tests/README_LIPU_TESTS.md) for details.

---

## 📊 API Standards

### Request Format

```http
POST /api/endpoint
Content-Type: application/json
Accept: application/json
Authorization: Bearer {token}

{
  "field": "value"
}
```

### Response Format

**Success:**
```json
{
  "data": { ... },
  "message": "Operation successful",
  "meta": { ... }
}
```

**Error:**
```json
{
  "error": "Error type",
  "message": "Error message",
  "status_code": 400,
  "errors": { ... }
}
```

### Pagination

```json
{
  "data": [...],
  "meta": {
    "current_page": 1,
    "total": 50,
    "per_page": 15,
    "last_page": 4
  },
  "links": {
    "first": "/api/endpoint?page=1",
    "last": "/api/endpoint?page=4",
    "prev": null,
    "next": "/api/endpoint?page=2"
  }
}
```

---

## 🔒 Security

### Authentication
- **Method**: Sanctum Bearer Token
- **Header**: `Authorization: Bearer {token}`
- **Expiry**: Configurable (default: 24 hours)

### Rate Limiting
- **Default**: 60 requests/minute per user
- **Header**: `X-RateLimit-Limit`, `X-RateLimit-Remaining`

### CORS
- Configured in `api/config/cors.php`
- Allow specific origins in production

### Best Practices
1. Never commit tokens to version control
2. Use HTTPS in production
3. Rotate tokens regularly
4. Implement IP whitelisting for sensitive operations
5. Log all API access

---

## 📝 Contributing

### Adding New API Documentation

1. **Create documentation file**:
   ```bash
   touch api/docs/api/new-api.md
   ```

2. **Follow template structure**:
   - Introduction
   - Authentication
   - Endpoints (with examples)
   - Error handling
   - Best practices

3. **Create Postman collection**:
   ```bash
   touch postman/new-api.json
   ```

4. **Update this README**:
   - Add to "Available APIs" table
   - Add to "Available Documentation" section

5. **Create tests**:
   ```bash
   touch api/tests/Feature/NewApiTest.php
   ```

---

## 🔄 Changelog

| Date | API | Version | Changes |
|------|-----|---------|---------|
| 2025-11-20 | Roles | 1.0.0 | Initial release |

---

## 📧 Support

**JIRA Ticket**: LIPU-91  
**Documentation Issues**: Create a ticket with label `documentation`  
**API Issues**: Create a ticket with label `api`

---

## 🔗 Related Resources

- [LIPU Roles Overview](../ROLES_LIPU.md)
- [Testing Guide](../../tests/README_LIPU_TESTS.md)
- [Database Seeders](../../database/seeders/)
- [Project README](../../../README.md)

---

**Last Updated**: 2025-11-20  
**Status**: ✅ Active Development


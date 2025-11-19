# 📋 Roles and Permissions - LIPU MMS

Role and permission matrix for LIPU Material Management System.

## 🎭 Defined Roles

### 1. LIPU Administrator
- **Guard**: `sanctum`
- **Description**: Full system administrator with complete access to all modules and configurations
- **Service**: `lipu-mms`
- **Protection**: Not mutable, not deletable
- **Use Case**: System administrators who configure and maintain the LIPU platform
- **Future Permissions** (TBD in Requirement #3):
  - Full system configuration
  - User management
  - Role and permission management
  - All module access

### 2. Plant Operator
- **Guard**: `sanctum`
- **Description**: Operates plant equipment and records concrete production data
- **Service**: `lipu-mms`
- **Protection**: Mutable, deletable
- **Use Case**: Plant floor operators who manage daily concrete production
- **Future Permissions** (TBD in Requirement #3):
  - Record production batches
  - View assigned orders
  - Update production status
  - Report incidents

### 3. Fleet Supervisor
- **Guard**: `sanctum`
- **Description**: Manages truck fleet, driver assignments, and route planning
- **Service**: `lipu-mms`
- **Protection**: Mutable, deletable
- **Use Case**: Fleet managers who coordinate vehicles and deliveries
- **Future Permissions** (TBD in Requirement #3):
  - Assign vehicles
  - Manage drivers
  - View telemetry
  - Plan routes
  - Track deliveries

### 4. Data Analyst
- **Guard**: `sanctum`
- **Description**: Read-only access for reports, analytics, and dashboards
- **Service**: `lipu-mms`
- **Protection**: Mutable, deletable
- **Use Case**: Business analysts who need visibility for reporting
- **Future Permissions** (TBD in Requirement #3):
  - View all dashboards
  - Export reports
  - Read-only access to all modules
  - No create/update/delete permissions

---

## 🔧 Usage

### Run Seeder

```bash
# Option 1: Specific seeder
php artisan db:seed --class=LipuRolesSeeder

# Option 2: All seeders
php artisan db:seed

# Option 3: Fresh + seed (WARNING: deletes data)
php artisan migrate:fresh --seed
```

### Verify Roles

```bash
# Using tinker
php artisan tinker
>>> \Illuminate\Support\Facades\DB::table('roles')->where('service', 'lipu-mms')->get(['name', 'description']);

# Using psql (if in Docker)
docker compose exec database psql -U fleetbase -d fleetbase -c "SELECT name, guard_name, description FROM roles WHERE service = 'lipu-mms';"
```

### Query Roles in Application

```php
// Get all LIPU roles
$lipuRoles = DB::table('roles')
    ->where('service', 'lipu-mms')
    ->get();

// Get specific role
$adminRole = DB::table('roles')
    ->where('name', 'LIPU Administrator')
    ->where('guard_name', 'sanctum')
    ->first();
```

---

## 📊 Role Matrix

| Role | Create | Read | Update | Delete | Manage Users | Configure System |
|------|--------|------|--------|--------|--------------|------------------|
| LIPU Administrator | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Plant Operator | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Fleet Supervisor | ✅ | ✅ | ✅ | ⚠️ Limited | ❌ | ❌ |
| Data Analyst | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |

*Note: Detailed permissions will be defined in Requirement #3 (Tests and Permission Assignment)*

---

## 🔐 Security Notes

- All roles use `guard_name = 'sanctum'` for API authentication
- Protected role: `LIPU Administrator` cannot be edited or deleted (`is_mutable = false`, `is_deletable = false`)
- The `service = 'lipu-mms'` field identifies LIPU-specific roles vs generic Fleetbase roles
- Roles are company-scoped through `company_uuid` for multi-tenancy

---

## 🚀 Next Steps

1. ✅ **Requirement #1**: Define and seed LIPU roles (this document)
2. ⏭️ **Requirement #2**: Add Mexico-specific validations (optional, low priority)
3. ⏭️ **Requirement #3**: Create comprehensive test suite and assign permissions
4. ⏭️ **Requirement #4**: Generate API documentation (OpenAPI/Swagger)

---

## 📝 Notes

- Roles can be assigned to users via the `model_has_roles` table
- Permissions will be assigned to roles via the `role_has_permissions` table
- This seeder is idempotent and can be run multiple times safely
- Created: 2025-11-19
- Last Updated: 2025-11-19


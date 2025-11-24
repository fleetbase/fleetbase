# Activity Reports API Documentation

## 📋 Overview

API endpoint para obtener reportes de actividades de bitácora agrupados por sección/módulo.

**Endpoint**: `GET /api/v1/activity/reports-by-section`

**Controller**: `App\Http\Controllers\ActivityReportController@reportsBySection`

## 🔐 Autenticación

Requiere autenticación Bearer token.

```http
Authorization: Bearer {token}
```

## 📥 Request

### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `start_date` | ISO 8601 DateTime | No | 7 días atrás | Fecha de inicio del período |
| `end_date` | ISO 8601 DateTime | No | Ahora | Fecha de fin del período |
| `sections` | Array | No | Todas | Filtrar por secciones específicas |

### Ejemplos de Request

#### Últimos 7 días (default)
```http
GET /api/v1/activity/reports-by-section
```

#### Período personalizado
```http
GET /api/v1/activity/reports-by-section?start_date=2025-11-01T00:00:00Z&end_date=2025-11-21T23:59:59Z
```

#### Filtrar por secciones específicas
```http
GET /api/v1/activity/reports-by-section?sections[]=iam&sections[]=chat
```

#### Hoy
```http
GET /api/v1/activity/reports-by-section?start_date=2025-11-21T00:00:00Z&end_date=2025-11-21T23:59:59Z
```

## 📤 Response

### Success Response (200 OK)

```json
{
  "sections": [
    {
      "name": "IAM",
      "total_activities": 145,
      "actions": {
        "created": 45,
        "updated": 78,
        "deleted": 22
      },
      "trend": 12.5,
      "trend_direction": "up",
      "last_activity": "2025-11-21T10:30:00.000000Z"
    },
    {
      "name": "Chat",
      "total_activities": 89,
      "actions": {
        "created": 23,
        "updated": 54,
        "deleted": 12
      },
      "trend": -5.2,
      "trend_direction": "down",
      "last_activity": "2025-11-21T09:15:00.000000Z"
    },
    {
      "name": "Notifications",
      "total_activities": 67,
      "actions": {
        "created": 34,
        "updated": 28,
        "viewed": 5
      },
      "trend": 8.3,
      "trend_direction": "up",
      "last_activity": "2025-11-21T08:45:00.000000Z"
    }
  ]
}
```

### Response Fields

#### Section Object

| Field | Type | Description |
|-------|------|-------------|
| `name` | String | Nombre de la sección (log_name) |
| `total_activities` | Integer | Total de actividades en el período |
| `actions` | Object | Desglose de actividades por tipo de acción |
| `trend` | Float | Porcentaje de cambio vs período anterior |
| `trend_direction` | String | Dirección de la tendencia: `up`, `down`, `neutral` |
| `last_activity` | DateTime | Timestamp de la última actividad |

#### Actions Object

Contiene pares clave-valor donde:
- **Clave**: Tipo de acción (ej: `created`, `updated`, `deleted`, `viewed`)
- **Valor**: Cantidad de veces que ocurrió esa acción

Ejemplo:
```json
{
  "created": 45,
  "updated": 78,
  "deleted": 22,
  "viewed": 10
}
```

### Error Responses

#### 401 Unauthorized
```json
{
  "error": "Unauthenticated"
}
```

#### 500 Internal Server Error
```json
{
  "error": "Error al procesar la solicitud",
  "message": "Detalles del error"
}
```

## 🔢 Cálculo de Tendencias

La tendencia se calcula comparando el período actual con el período anterior de igual duración.

**Fórmula**:
```
trend = ((current_total - previous_total) / previous_total) * 100
```

**Ejemplos**:
- Período actual: 145 actividades
- Período anterior: 129 actividades
- Tendencia: `((145 - 129) / 129) * 100 = +12.4%`

**Dirección de tendencia**:
- `up`: trend > 0
- `down`: trend < 0
- `neutral`: trend = 0

**Casos especiales**:
- Si `previous_total = 0` y `current_total > 0`: trend = `100%` (up)
- Si `previous_total = 0` y `current_total = 0`: trend = `0%` (neutral)

## 📊 Ordenamiento

Las secciones se devuelven ordenadas por `total_activities` en orden descendente (mayor a menor).

## ⚡ Performance

### Optimizaciones Implementadas

1. **Índices en base de datos**:
   - `activity.log_name`
   - `activity.created_at`
   - `activity.description`

2. **Límites de consulta**:
   - Máximo recomendado: 3 meses de datos
   - Para períodos mayores, considerar agregaciones pre-calculadas

3. **Cache** (futuro):
   - TTL: 5 minutos
   - Key: `activity_reports:{start_date}:{end_date}:{sections}`

### Tiempos de Respuesta Esperados

| Período | Registros | Tiempo |
|---------|-----------|--------|
| Hoy | ~1,000 | < 200ms |
| 7 días | ~10,000 | < 500ms |
| 30 días | ~50,000 | < 1s |
| 3 meses | ~200,000 | < 2s |

## 🧪 Testing

### Ejemplo con cURL

```bash
curl -X GET \
  'http://localhost:8000/api/v1/activity/reports-by-section?start_date=2025-11-01T00:00:00Z&end_date=2025-11-21T23:59:59Z' \
  -H 'Authorization: Bearer YOUR_TOKEN_HERE' \
  -H 'Content-Type: application/json'
```

### Ejemplo con JavaScript (Fetch)

```javascript
const response = await fetch('/api/v1/activity/reports-by-section', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});

const data = await response.json();
console.log(data.sections);
```

### Ejemplo con Ember Service

```javascript
// En tu componente Ember
const response = await this.fetch.get('activity/reports-by-section', {
  start_date: '2025-11-01T00:00:00Z',
  end_date: '2025-11-21T23:59:59Z'
}, { 
  namespace: 'api/v1' 
});

console.log(response.sections);
```

## 📝 Notas de Implementación

### Backend (Laravel)

**Archivo**: `api/app/Http/Controllers/ActivityReportController.php`

**Método**: `reportsBySection(Request $request)`

**Query SQL Principal**:
```sql
SELECT 
  log_name as section,
  COUNT(*) as total,
  MAX(created_at) as last_activity
FROM activity
WHERE created_at BETWEEN ? AND ?
GROUP BY log_name
ORDER BY total DESC
```

**Subquery para acciones**:
```sql
SELECT description, count(*) as count
FROM activity
WHERE log_name = ?
  AND created_at BETWEEN ? AND ?
GROUP BY description
```

### Frontend (Ember.js)

**Componente**: `console/app/components/bitacora-report-card.js`

**Método**: `fetchReportData(params)`

```javascript
async fetchReportData(params = {}) {
  return this.fetch.get('activity/reports-by-section', params, { 
    namespace: 'api/v1' 
  });
}
```

## 🔒 Seguridad

### Validaciones

1. **Autenticación**: Requiere token válido
2. **Autorización**: Usuario debe tener permisos de lectura en bitácora
3. **Validación de fechas**: 
   - `start_date` debe ser menor que `end_date`
   - Período máximo: 1 año
4. **Rate limiting**: 60 requests por minuto por usuario

### Datos Sensibles

- Las actividades se filtran por `company_uuid` del usuario autenticado
- No se exponen datos de otras organizaciones
- Los detalles de actividades se omiten (solo agregaciones)

## 🚀 Roadmap

### v1.1 (Futuro)
- [ ] Cache con Redis (TTL 5 minutos)
- [ ] Soporte para comparación de períodos
- [ ] Agregaciones por hora/día/semana/mes
- [ ] Filtros adicionales (usuario, tipo de acción)
- [ ] Webhooks para alertas de tendencias

### v2.0 (Futuro)
- [ ] Tabla de agregaciones pre-calculadas
- [ ] Background jobs para reportes pesados
- [ ] Exportación desde backend
- [ ] Gráficas de tendencias históricas

## 📞 Soporte

Para reportar bugs o solicitar features:
- **Email**: soporte@creai.mx
- **JIRA**: Crear ticket en proyecto LIPU

## 📄 Changelog

### v1.0.0 (2025-11-21)
- ✨ Versión inicial del endpoint
- 📊 Agregación por sección
- 📈 Cálculo de tendencias
- 🔍 Filtros por período y secciones
- ⚡ Optimización con índices

## 👥 Autores

- **Backend**: M.Sc. Jesús Armando Mendoza Ramos
- **Documentación**: M.Sc. Jesús Armando Mendoza Ramos

## 📄 Licencia

Propietario - CreAI


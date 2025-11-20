# 📊 Documentación del Endpoint: Reportes de Actividad por Sección

**Ticket:** LIPU-101  
**Fecha:** 20 de Noviembre de 2025  
**Autor:** Armadno Mendoza

---

## Descripción

Este endpoint proporciona métricas agregadas de las actividades del sistema, agrupadas por sección (`log_name`). Está diseñado para alimentar el widget de "Reportes por Sección" en la Bitácora General.

## Endpoint

`GET /api/v1/activity/reports-by-section`

## Parámetros de Consulta (Query Params)

| Parámetro    | Tipo   | Requerido | Descripción                                                                                   | Ejemplo                 |
|--------------|--------|-----------|-----------------------------------------------------------------------------------------------|-------------------------|
| `start_date` | String | No        | Fecha de inicio del reporte. Formato `YYYY-MM-DD` o ISO. **Default:** Hace 7 días.           | `2025-11-01`            |
| `end_date`   | String | No        | Fecha de fin del reporte. Formato `YYYY-MM-DD` o ISO. **Default:** Ahora.                    | `2025-11-20`            |
| `sections[]` | Array  | No        | Filtrar por secciones específicas. Si se omite, devuelve todas las secciones con actividad. | `sections[]=user-management` |

## Respuesta (JSON)

El endpoint devuelve un objeto JSON con una propiedad principal `sections`, que contiene un array de objetos con las métricas.

### Estructura

```json
{
  "sections": [
    {
      "name": "string",             // Nombre de la sección (log_name)
      "total_activities": "integer", // Total de registros en el periodo
      "actions": {                   // Desglose por tipo de acción (description)
        "created": "integer",
        "updated": "integer",
        "deleted": "integer",
        "viewed": "integer"
      },
      "trend": "string",             // Tendencia vs periodo anterior (ej. "+15.5%", "-3.2%")
      "last_activity": "datetime"    // Fecha/hora del último registro en esta sección
    }
  ]
}
```

### Ejemplo de Respuesta Real

```json
{
  "sections": [
    {
      "name": "bitacora",
      "total_activities": 60,
      "actions": {
        "created": 14,
        "updated": 18,
        "deleted": 14,
        "viewed": 14
      },
      "trend": "+17.6%",
      "last_activity": "2025-11-20 15:29:16"
    },
    {
      "name": "user-management",
      "total_activities": 56,
      "actions": {
        "created": 16,
        "updated": 16,
        "deleted": 9,
        "viewed": 15
      },
      "trend": "-3.4%",
      "last_activity": "2025-11-20 06:03:39"
    }
  ]
}
```

## Lógica de Cálculo

1.  **Total:** Conteo simple de registros en la tabla `activity` donde `log_name` coincide con la sección y `created_at` está dentro del rango.
2.  **Tendencia (Trend):**
    *   Se calcula comparando el periodo actual (`start_date` a `end_date`) con un periodo inmediatamente anterior de **igual duración**.
    *   Fórmula: `((Total Actual - Total Anterior) / Total Anterior) * 100`.
    *   Si el periodo anterior tiene 0 actividades, la tendencia se marca como `+100%` si hay actividad actual, o `0%` si no.
3.  **Acciones:** Agregación de conteos agrupados por el campo `description` (que almacena la acción como 'created', 'updated', etc.).

## Notas de Implementación Backend

*   **Controlador:** `App\Http\Controllers\ActivityReportController`
*   **Ruta:** Definida en `App\Providers\RouteServiceProvider`
*   **Base de Datos:** Utiliza la tabla `activity` existente de Fleetbase.


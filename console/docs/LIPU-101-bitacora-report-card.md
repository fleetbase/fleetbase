# LIPU-101 – BitacoraReportCard (Plan de implementación)

## 1. Objetivo
Crear un componente reutilizable (`BitacoraReportCard`) para la pantalla de Bitácora General que consuma los reportes agregados por sección y presente un resumen interactivo (header + filtros básicos, listado principal y footer con CTA) listo para futuras extensiones (gráficas, exportaciones, comparaciones).

## 2. Alcance de este entregable
- Componente Glimmer (`console/app/components/bitacora-report-card.js` + `.hbs`).
- Estilos específicos (`console/app/styles/components/bitacora-report-card.css`).
- Integración inicial con servicio de datos (mock o endpoint real cuando esté disponible).
- Auto-refresh cada 5 minutos (configurable) y manejo de estados (loading, empty, error).
- Botón "Ver detalles" conectado a la ruta existente de bitácora.
- Documentación y pruebas de integración enfocadas en la UI y el flujo de datos.

## 3. Flujo y dependencias
1. **Data source**: servicio `fetch`/`ajax` → endpoint `GET /api/v1/activity/reports-by-section` (temporalmente se permite un mock).
2. **Hydratación**: `loadReportData()` normaliza la respuesta (`sections`, `trend`, `actions`, `last_activity`).
3. **Estado**: `tracked` para `selectedPeriod`, `sections`, `isLoading`, `errorMessage`, `lastUpdated`.
4. **Auto-refresh**: `pollster` con intervalo fijo (300000 ms) y limpieza en `willDestroy`.
5. **UI**: header + selector de período simple (placeholder antes del `PeriodSelector` real), body responsive con lista, footer con CTA.
6. **Navegación**: acción `@onViewDetails` o transición directa a la ruta `console.bitacora.reports` (definir según necesidades del producto).

## 4. Layout propuesto
- **Header**
  - Icono + título (`intl.t('bitacora.reports_by_section')`).
  - Selector inline (dropdown de períodos predefinidos). Botón de refresh manual opcional.
- **Body**
  - `{{#each sections as |section|}}` → nombre, total formateado, tendencia (flechas + colores), desglose por acción (chips/pills), timeline de última actividad.
  - Skeleton loader cuando `isLoading`. Empty state con mensaje e icono cuando `sections.length === 0`.
- **Footer**
  - Texto "Actualizado hace X" + botón `primary` "Ver detalles".

## 5. Responsividad y accesibilidad
- Grid adaptable (`md:grid-cols-2`, `lg:grid-cols-3` para listas, fallback stack en móvil).
- Uso de `aria-label` en indicadores de tendencia.
- Contraste ≥ WCAG AA (usar tokens de Tailwind ya configurados).
- Navegación por teclado en selector/CTA.

## 6. Estrategia de estados
| Estado          | Descripción                                    | Comportamiento |
|-----------------|------------------------------------------------|---------------|
| Loading         | Primera carga o refresh manual                 | Skeleton + texto "Cargando" |
| Ready           | Datos presentes                                | Lista completa + métricas |
| Empty           | `sections` vacío                               | Icono + texto "No hay actividad en el período" |
| Error           | Falla en fetch                                 | Mensaje + botón "Reintentar" |

## 7. Auto-actualización
- Intervalo configurable (`REFRESH_INTERVAL_MS = 300000`).
- Reutilizar `later`/`timeout` según preferencia Ember, limpiar en `willDestroy`.
- Mostrar marca temporal `lastUpdated` para transparencia.

## 8. Testing
- `console/tests/integration/components/bitacora-report-card-test.js`.
  - Render básico (loading → datos).
  - Cambio de período (mockear servicio).
  - Estados empty y error.
  - Acción de "Ver detalles" disparada correctamente.

## 9. Pendientes posteriores
- Integrar `PeriodSelector` definitivo (requerimiento 4).
- Conectar `BitacoraReportChart` (requerimiento 3).
- Añadir exportaciones y comparativas (requerimientos 5 y 6).

## 10. Referencias
- Widgets existentes (`console/app/components/widget/*`) para reutilizar patrones de card.
- Servicios `console/app/services/fetch.js` y utilidades de formato.
- Documentación previa guardada en `personal_refinamientos/plan_LIPU-101.md`.

Este documento sirve como guía local y se fusionará con la documentación oficial al cierre del ticket.

# BitacoraReportCard Component

Componente de Ember.js que muestra reportes de actividades agrupados por sección con gráficas, métricas y exportación.

## 📋 Descripción

`BitacoraReportCard` es un componente completo para visualizar reportes de bitácora organizados por sección/módulo. Incluye:

- 📊 Gráfica horizontal de barras con Chart.js
- 📅 Selector de período de tiempo
- 📈 Indicadores de tendencia (↑↓) con colores
- 📄 Paginación (4 items por página por defecto)
- 💾 Exportación a CSV, Excel y PDF
- 🔄 Actualización automática cada 5 minutos
- ⏳ Estados de carga, error y vacío
- 📱 Diseño responsive

## 🚀 Uso Básico

```handlebars
{{! Uso simple - carga datos del backend automáticamente }}
<BitacoraReportCard />
```

## 🎨 Uso Avanzado

```handlebars
{{! Con configuración personalizada }}
<BitacoraReportCard
  @period="last_30_days"
  @pageSize={{6}}
  @chartLimit={{5}}
  @disableAutoRefresh={{false}}
  @onViewDetails={{this.handleViewDetails}}
/>
```

## 📦 Props

### @period
- **Tipo**: `String`
- **Default**: `'last_7_days'`
- **Opciones**: `'today'`, `'last_7_days'`, `'last_30_days'`, `'this_month'`, `'previous_month'`
- **Descripción**: Período de tiempo inicial para los reportes

```handlebars
<BitacoraReportCard @period="today" />
```

### @pageSize
- **Tipo**: `Number`
- **Default**: `4`
- **Descripción**: Número de secciones por página

```handlebars
<BitacoraReportCard @pageSize={{6}} />
```

### @chartLimit
- **Tipo**: `Number`
- **Default**: `5`
- **Descripción**: Número máximo de secciones a mostrar en la gráfica

```handlebars
<BitacoraReportCard @chartLimit={{10}} />
```

### @sections
- **Tipo**: `Array`
- **Default**: `null`
- **Descripción**: Secciones externas (si se provee, no carga del backend)

```handlebars
<BitacoraReportCard @sections={{this.customSections}} />
```

**Formato esperado**:
```javascript
[
  {
    name: 'IAM',
    slug: 'iam',
    total: 145,
    actions: {
      created: 45,
      updated: 78,
      deleted: 22
    },
    trend: '+12.5%',
    trendDirection: 'up',
    lastActivity: '2025-11-21T10:30:00Z'
  }
]
```

### @disableAutoRefresh
- **Tipo**: `Boolean`
- **Default**: `false`
- **Descripción**: Deshabilita la actualización automática cada 5 minutos

```handlebars
<BitacoraReportCard @disableAutoRefresh={{true}} />
```

### @onViewDetails
- **Tipo**: `Function`
- **Default**: `null`
- **Descripción**: Callback cuando se hace clic en "Ver detalles"

```handlebars
<BitacoraReportCard @onViewDetails={{this.handleViewDetails}} />
```

```javascript
@action
handleViewDetails() {
  this.router.transitionTo('console.bitacora.details');
}
```

### @query
- **Tipo**: `Object`
- **Default**: `{}`
- **Descripción**: Parámetros adicionales para la query del API

```handlebars
<BitacoraReportCard @query={{hash user_id=this.userId}} />
```

### @chartBarColor
- **Tipo**: `String`
- **Default**: `'#1D9A6C'`
- **Descripción**: Color de las barras de la gráfica

```handlebars
<BitacoraReportCard @chartBarColor="#3B82F6" />
```

### @chartOptions
- **Tipo**: `Object`
- **Default**: `{}`
- **Descripción**: Opciones adicionales para Chart.js

```handlebars
<BitacoraReportCard @chartOptions={{hash animation=(hash duration=500)}} />
```

## 🎯 Eventos

El componente emite los siguientes eventos:

### onViewDetails
Se dispara cuando el usuario hace clic en "Ver detalles"

```javascript
@action
handleViewDetails() {
  console.log('Usuario quiere ver detalles');
}
```

## 📊 Estructura de Datos del API

### Endpoint
```
GET /api/v1/activity/reports-by-section
```

### Query Parameters
- `start_date`: ISO 8601 date string
- `end_date`: ISO 8601 date string

### Response
```json
{
  "sections": [
    {
      "name": "IAM",
      "slug": "iam",
      "total_activities": 145,
      "actions": {
        "created": 45,
        "updated": 78,
        "deleted": 22
      },
      "trend": 12.5,
      "trend_direction": "up",
      "last_activity": "2025-11-21T10:30:00Z"
    }
  ]
}
```

## 🎨 Personalización de Estilos

El componente usa clases CSS con el prefijo `bitacora-report-card__`:

```css
/* Personalizar el card */
.bitacora-report-card {
  /* tus estilos */
}

/* Personalizar secciones */
.bitacora-report-card__section {
  /* tus estilos */
}

/* Personalizar tendencias */
.bitacora-report-card__trend--up {
  color: green;
}

.bitacora-report-card__trend--down {
  color: red;
}
```

## 🔧 Métodos Públicos

### loadReportData(options)
Recarga los datos del backend

```javascript
// En tu componente padre
this.bitacoraCard.loadReportData({ silent: true });
```

## 📱 Responsive Design

El componente es completamente responsive:

- **Desktop**: Vista completa con gráfica y tabla
- **Tablet**: Layout adaptado con gráfica más pequeña
- **Mobile**: Vista apilada con scroll horizontal para la tabla

## ♿ Accesibilidad

- ✅ Navegación por teclado
- ✅ ARIA labels en gráficas
- ✅ Contraste de colores WCAG AA
- ✅ Textos alternativos

## 🧪 Testing

```javascript
// Test de integración
test('it renders with data', async function(assert) {
  await render(hbs`<BitacoraReportCard />`);
  
  await waitFor('.bitacora-report-card__sections');
  
  assert.dom('.bitacora-report-card__section').exists();
});
```

## 📦 Dependencias

- `chart.js`: Para las gráficas
- `date-fns`: Para formateo de fechas
- `@fleetbase/ember-ui`: Para componentes Button y Select

## 🐛 Troubleshooting

### La gráfica no se muestra
- Verifica que `chart.js` esté instalado
- Asegúrate de que hay datos en `sections`

### Los datos no se cargan
- Verifica que el endpoint `/api/v1/activity/reports-by-section` esté disponible
- Revisa la consola del navegador para errores de red

### La exportación PDF no funciona
- Verifica que el navegador permita ventanas emergentes
- Asegúrate de que hay datos para exportar

## 📝 Changelog

### v1.0.0 (2025-11-21)
- ✨ Versión inicial
- 📊 Gráfica horizontal con Chart.js
- 📅 Selector de período
- 📈 Indicadores de tendencia
- 📄 Paginación
- 💾 Exportación CSV, Excel, PDF
- 🔄 Auto-refresh cada 5 minutos

## 👥 Autores

- M.Sc. Jesús Armando Mendoza Ramos

## 📄 Licencia

Propietario - CreAI


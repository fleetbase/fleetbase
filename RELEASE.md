# 🚀 Fleetbase v0.7.20 — 2025-12-05

> "Major architectural & universe framework refactor for improved build, loading and initialization of extensions and system."

---

## @fleetbase/ember-core v0.3.7

### 🎯 Major Features

#### Universe Service Refactor
Complete architectural overhaul of the Universe service with separation of concerns into specialized sub-services:

- **ExtensionManager**: Manages extension loading, engine instances, and lifecycle hooks
- **RegistryService**: Fully dynamic, Map-based registry system for cross-engine resource sharing
- **MenuService**: Dedicated menu item and panel management with event support
- **WidgetService**: Dashboard widget registration and retrieval system
- **HookService**: Application lifecycle hooks and custom event hooks

**Key Benefits:**
- Improved performance with lazy loading and proper engine lifecycle management
- Better separation of concerns and maintainability
- Enhanced cross-engine resource sharing via Ember's application container
- Backward compatibility maintained through facade pattern

#### Enhanced Extension System

**New Extension Patterns:**
- `extension.js` hook patterns with `setupExtension()` and `onEngineLoaded()` support
- `whenEngineLoaded()` utility method that handles both loaded and not-yet-loaded engines
- Comprehensive extension checking methods: `isInstalled()`, `isEngineLoaded()`, `isEngineLoading()`
- Automatic hook execution for router-loaded engines

**Engine Loading Improvements:**
- Fixed race conditions between engine loading and hook registration
- Proper tracking of router-loaded engines in `loadedEngines` Map
- Patched `buildChildEngineInstance` to run hooks for router-loaded engines
- Two-phase extension setup: registration first, then hook execution

**Performance Optimizations:**
- `extensions.json` loading with localStorage caching
- Reduced console noise by removing excessive debug logs
- Performance monitoring for extension load times

#### Helper Registration System
- Cross-engine helper sharing via application container
- `registerHelper()` method for template helpers
- Support for both class-based and function-based helpers
- Automatic registration to application container for global access

#### Component Registration Enhancements
- `registerRenderableComponent()` for cross-engine component sharing
- Support for component classes via `ExtensionComponent`
- Automatic component registration to engine containers
- `getRenderableComponents()` for retrieving registered components

### 🔧 API Improvements

#### UniverseService
- `getService()` method with flexible naming pattern resolution:
  - Short names: `"menu"` → `universe/menu-service`
  - Plural variations: `"hooks"` or `"hook"` → `universe/hook-service`
  - CamelCase: `"menuService"` → `universe/menu-service`
  - Full names: `"menu-service"` → `universe/menu-service`
  - With namespace: `"universe/menu-service"` → `universe/menu-service`
- `whenEngineLoaded()` for simplified engine-dependent setup
- `getServiceFromEngine()` for accessing engine-specific services
- `getApplicationInstance()` with fallback to `window.Fleetbase`

#### MenuService
- Computed getters for template access: `headerMenuItems`, `adminMenuItems`, `adminMenuPanels`
- Event triggers for backward compatibility
- Proper `finalView` normalization for all menu items
- `onClick` handlers wrapped with `menuItem` and `universe` parameters
- Fixed panel item slug/view structure to match original behavior

#### WidgetService
- Per-dashboard widget registration
- `registerWidgets()` for making widgets available on dashboards
- `registerDefaultWidgets()` for auto-loading specific widgets
- Proper widget filtering by dashboard ID

### 🐛 Bug Fixes

#### Extension Loading
- Resolved timeout errors during engine boot
- Fixed duplicate dashboard ID errors
- Corrected engine instance tracking and retrieval
- Fixed race conditions in extension setup

#### Menu System
- Fixed registry name mismatch for header menu items
- Corrected panel item structure for proper routing
- Added null checks before `dasherize` calls
- Fixed `onClick` handler parameter passing

#### Registry System
- Fixed widget registry lookup to work with array storage
- Proper filtering by registration key
- Shared registries Map across all engines via application container
- Triggered reactivity when creating new registries

#### Service Resolution
- Fixed service injection on engine boot
- Corrected service map injection
- Added missing `getServiceFromEngine` method
- Fixed `virtualRouteRedirect` and `getViewFromTransition` methods

### 📦 Exports & Structure
- Named exports on "exports" namespace
- Separated default and named exports in app/exports re-exports

### 🔄 ResourceActionService
- Allow properties to be set from initialization options
- Improved flexibility for service configuration

## @fleetbase/ember-ui v0.3.12

### 🎯 Major Features

#### Dashboard Service Refactor
Complete rewrite to support the new Universe service architecture:

- Direct injection of `widgetService` instead of going through universe
- Updated to use new widget service API
- Proper dashboard cleanup and recreation on route revisit
- Race condition fixes with `drop` task modifier

#### Widget Panel Enhancements

**Search & Filter:**
- Real-time keyword search for widgets by name and description
- `@tracked searchQuery` with `updateSearchQuery` action
- Improved widget discoverability

**Floating Pagination:**
- New floating pagination style (bottom-right, rounded, shadowed)
- Reveals horizontal scrollbar for better table navigation
- `@useTfootPagination` arg for backward compatibility
- Default to floating, opt-in to table footer pagination

**Thin Scrollbars:**
- Consistent 8px scrollbar height for both axes
- Webkit scrollbar styles for modern browsers
- Firefox `scrollbar-width: thin` support
- Dark mode scrollbar colors

### 🔧 Component Improvements

#### LazyEngineComponent
- Support for both path-based (lazy) and class-based (immediate) components
- Automatic component registration to engine containers
- Proper engine component lookup
- Helper for use with `{{component}}` syntax

#### RegistryYield
- Converted `yieldables` to computed getter for automatic reactivity
- Automatic wrapping of components with `LazyEngineComponent`
- `isComponent` getter to detect component types vs menu items
- Updated to use `registryService.getRenderableComponents()`
- Removed event listener approach (now uses reactive getters)

#### LoadEngine Component
- New component for explicit engine loading
- Complements `LazyEngineComponent` for different use cases

### 🐛 Bug Fixes

#### Dashboard Service
- Fixed duplicate dashboard ID errors with `drop` task modifier
- Added try-catch in `_createDefaultDashboard` for race conditions
- Proper state checks (`isDeleted`, `isDestroying`, `isDestroyed`)
- Fixed reset() to unload dashboard-widgets before dashboards
- Prevents identity map conflicts when recreating dashboards

#### Widget Panel
- Fixed `availableWidgets` reactivity by converting to getter
- Use `args.defaultDashboardId` first, then fallback to `this.defaultDashboardId`
- Ensures widgets registered after component creation are visible
- Handles string-represented widgets and components

#### RegistryYield
- Fixed TypeError by removing `registryService.on` event listener
- RegistryService doesn't have Evented mixin, now uses reactive getters
- Components registered after construction now properly yielded

#### Table Styling
- Fixed floating pagination spacing (reduced padding, adjusted margins)
- Applied `overflow-x` to `.next-table-wrapper` instead of table
- Horizontal scrollbar now visible and not hidden by pagination
- Added `overflow-y: visible` to prevent vertical scroll issues

### 🎨 UX Improvements
- Minor UX tweaks to widget panel component
- Improved widget panel layout and spacing
- Better visual hierarchy for widget selection
- Enhanced table navigation with floating pagination

## Migration Guide

### For Extension Developers

#### Using the New Extension Patterns

**Before:**
```javascript
// In addon/engine.js
export default class MyEngine extends Engine {
  setupExtension() {
    // Setup code here
  }
}
```

**After:**
```javascript
// In addon/extension.js
import { Widget } from '@fleetbase/ember-core/contracts';

export default {
    setupExtension(universe) {
        // Get widget service
        const widgetService = universe.getService('widget');

        // Register widgets, menu items, etc.
        widgetService.registerWidgets('dashboard', [new Widget({ ... })]);
        
        // Register hooks for when other engines load
        universe.whenEngineLoaded('@fleetbase/fleetops-engine', (engineInstance) => {
            // Setup integration with FleetOps
        });
    }
}
```

#### Accessing Universe Sub-Services

**Flexible Service Resolution:**
```javascript
// All of these work:
const menuService = universe.getService('menu');
const menuService = universe.getService('menu-service');
const menuService = universe.getService('menuService');
const menuService = universe.getService('universe/menu-service');

const hookService = universe.getService('hooks');
const widgetService = universe.getService('widgets');
const registry = universe.getService('registry');
```

#### Widget Registration

**Before:**
```javascript
universe.registerWidget(widgetObject);
```

**After:**
```javascript
// Register widgets available for a dashboard
universe.registerWidgets('dashboard', [widget1, widget2]);

// Register widgets that auto-load on a dashboard
universe.registerDefaultWidgets('dashboard', [widget1]);
```

---

## ⚠️ Breaking Changes
- **NO MAJOR BREAKING CHANGED** Both releases maintain full backward compatibility with existing code. The refactor uses a facade pattern to ensure all existing APIs continue to work while providing new, improved patterns for future development.
### Notice
- Extensions must adapt to the new `extension.js` pattern for initialization setup.
- Extension dependencies are not auto-loaded and initialized, dependencies must be explicitly loaded from the setup `extension.js`
- `UniverseService` has major changes which refactored core responsibilities to sub-services. There is backwards compatability, but plan to migrate to the new integration architecture.

---

## 🔧 Upgrade Steps
```bash
# Pull latest version
git pull origin main --no-rebase

# Update docker
docker compose pull
docker compose down && docker compose up -d

# Run deploy script
docker compose exec application bash -c "./deploy.sh"
```

### Post-Upgrade

1. Clear browser cache and localStorage
2. Restart your development server
3. Test extension loading and dashboard functionality
4. Check console for any deprecation warnings

## Need help? 
Join the discussion on [GitHub Discussions](https://github.com/fleetbase/fleetbase/discussions) or drop by [#fleetbase on Discord](https://discord.com/invite/HnTqQ6zAVn)

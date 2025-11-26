import { getOwner } from '@ember/application';
import { scheduleOnce } from '@ember/runloop';
import { Widget } from '@fleetbase/ember-core/contracts';

/**
 * Initializes the Universe by:
 * 1. Creating console-specific registries
 * 2. Registering default dashboard widgets
 * 3. Loading extension.js files from enabled extensions
 * 4. Executing boot callbacks
 * 
 * This replaces the old load-extensions and initialize-widgets initializers.
 * 
 * @param {ApplicationInstance} appInstance The application instance
 */
export function initialize(appInstance) {
    const universe = appInstance.lookup('service:universe');
    const widgetService = appInstance.lookup('service:universe/widget-service');
    const registryService = appInstance.lookup('service:universe/registry-service');
    const owner = getOwner(appInstance);
    const app = owner.application;

    // Set application instance on universe
    universe.applicationInstance = appInstance;

    // Create console-specific registries
    registryService.createRegistries(['@fleetbase/console', 'auth:login']);

    // Register default dashboard widgets
    const defaultWidgets = [
        new Widget({
            widgetId: 'welcome',
            name: 'Welcome',
            description: 'Welcome widget for new users',
            icon: 'hand-wave',
            component: 'widget/welcome',
            grid_options: { w: 12, h: 6, minW: 8, minH: 6 }
        }),
        new Widget({
            widgetId: 'getting-started',
            name: 'Getting Started',
            description: 'Getting started guide',
            icon: 'rocket',
            component: 'widget/getting-started',
            grid_options: { w: 12, h: 12, minW: 8, minH: 12 }
        })
    ];

    widgetService.registerDefaultWidgets(defaultWidgets);
    widgetService.registerWidgets('dashboard', defaultWidgets);

    // Load extension.js files from enabled extensions
    // The app.extensions array already respects config + user permissions
    const extensions = app.extensions || [];
    
    extensions.forEach(extensionName => {
        try {
            // Dynamically require the extension.js file
            // This is a small file with only metadata, not the full engine bundle
            const setupExtension = require(`${extensionName}/extension`).default;

            if (typeof setupExtension === 'function') {
                // Execute the extension setup function
                // This registers menus, widgets, hooks, etc. as metadata
                setupExtension(appInstance, universe);
            }
        } catch (error) {
            // Silently fail if extension.js doesn't exist
            // Extensions can migrate gradually to the new pattern
            // console.warn(`Could not load extension.js for ${extensionName}:`, error);
        }
    });

    // Execute any boot callbacks
    scheduleOnce('afterRender', universe, 'executeBootCallbacks');
}

export default {
    name: 'initialize-universe',
    initialize
};

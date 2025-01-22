import Service from '@ember/service';
import Evented from '@ember/object/evented';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { computed, action } from '@ember/object';
import { isBlank } from '@ember/utils';
import { A, isArray } from '@ember/array';
import { later } from '@ember/runloop';
import { dasherize, camelize } from '@ember/string';
import { pluralize } from 'ember-inflector';
import { getOwner } from '@ember/application';
import { assert, debug, warn } from '@ember/debug';
import RSVP from 'rsvp';
import loadInstalledExtensions from '../utils/load-installed-extensions';
import loadExtensions from '../utils/load-extensions';
import getWithDefault from '../utils/get-with-default';
import config from 'ember-get-config';

export default class UniverseService extends Service.extend(Evented) {
    @service router;
    @service intl;
    @service urlSearchParams;
    @tracked applicationInstance;
    @tracked enginesBooted = false;
    @tracked bootedExtensions = A([]);
    @tracked headerMenuItems = A([]);
    @tracked organizationMenuItems = A([]);
    @tracked userMenuItems = A([]);
    @tracked consoleAdminRegistry = {
        menuItems: A([]),
        menuPanels: A([]),
    };
    @tracked consoleAccountRegistry = {
        menuItems: A([]),
        menuPanels: A([]),
    };
    @tracked consoleSettingsRegistry = {
        menuItems: A([]),
        menuPanels: A([]),
    };
    @tracked dashboardWidgets = {
        defaultWidgets: A([]),
        widgets: A([]),
    };
    @tracked hooks = {};
    @tracked bootCallbacks = A([]);
    @tracked initialLocation = { ...window.location };

    /**
     * Computed property that returns all administrative menu items.
     *
     * @computed adminMenuItems
     * @public
     * @readonly
     * @memberof UniverseService
     * @returns {Array} Array of administrative menu items
     */
    @computed('consoleAdminRegistry.menuItems.[]') get adminMenuItems() {
        return this.consoleAdminRegistry.menuItems;
    }

    /**
     * Computed property that returns all administrative menu panels.
     *
     * @computed adminMenuPanels
     * @public
     * @readonly
     * @memberof UniverseService
     * @returns {Array} Array of administrative menu panels
     */
    @computed('consoleAdminRegistry.menuPanels.[]') get adminMenuPanels() {
        return this.consoleAdminRegistry.menuPanels;
    }

    /**
     * Computed property that returns all settings menu items.
     *
     * @computed settingsMenuItems
     * @public
     * @readonly
     * @memberof UniverseService
     * @returns {Array} Array of administrative menu items
     */
    @computed('consoleSettingsRegistry.menuItems.[]') get settingsMenuItems() {
        return this.consoleSettingsRegistry.menuItems;
    }

    /**
     * Computed property that returns all settings menu panels.
     *
     * @computed settingsMenuPanels
     * @public
     * @readonly
     * @memberof UniverseService
     * @returns {Array} Array of administrative menu panels
     */
    @computed('consoleSettingsRegistry.menuPanels.[]') get settingsMenuPanels() {
        return this.consoleSettingsRegistry.menuPanels;
    }

    /**
     * Transitions to a given route within a specified Ember engine.
     *
     * This action dynamically retrieves the specified engine's instance and its configuration to prepend the
     * engine's route prefix to the provided route. If the engine instance or its route prefix is not found,
     * it falls back to transitioning to the route without the prefix.
     *
     * @param {string} engineName - The name of the Ember engine.
     * @param {string} route - The route to transition to within the engine.
     * @param {...any} args - Additional arguments to pass to the router's transitionTo method.
     * @returns {Promise} A Promise that resolves with the result of the router's transitionTo method.
     *
     * @example
     * // Transitions to the 'management.fleets.index.new' route within the '@fleetbase/fleet-ops' engine.
     * this.transitionToEngineRoute('@fleetbase/fleet-ops', 'management.fleets.index.new');
     */
    @action transitionToEngineRoute(engineName, route, ...args) {
        const engineInstance = this.getEngineInstance(engineName);

        if (engineInstance) {
            const config = engineInstance.resolveRegistration('config:environment');

            if (config) {
                let mountedEngineRoutePrefix = config.mountedEngineRoutePrefix;

                if (!mountedEngineRoutePrefix) {
                    mountedEngineRoutePrefix = this._mountPathFromEngineName(engineName);
                }

                if (!mountedEngineRoutePrefix.endsWith('.')) {
                    mountedEngineRoutePrefix = mountedEngineRoutePrefix + '.';
                }

                return this.router.transitionTo(`${mountedEngineRoutePrefix}${route}`, ...args);
            }
        }

        return this.router.transitionTo(route, ...args);
    }

    /**
     * Initialize the universe service.
     *
     * @memberof UniverseService
     */
    initialize() {
        this.initialLocation = { ...window.location };
        this.trigger('init', this);
    }

    /**
     * Sets the application instance.
     *
     * @param {ApplicationInstance} - The application instance object.
     * @return {void}
     */
    setApplicationInstance(instance) {
        window.Fleetbase = instance;
        this.applicationInstance = instance;
    }

    /**
     * Retrieves the application instance.
     *
     * @returns {ApplicationInstance} - The application instance object.
     */
    getApplicationInstance() {
        return this.applicationInstance;
    }

    /**
     * Retrieves the mount point of a specified engine by its name.
    
     * @param {string} engineName - The name of the engine for which to get the mount point.
     * @returns {string|null} The mount point of the engine or null if not found.
     */
    getEngineMountPoint(engineName) {
        const engineInstance = this.getEngineInstance(engineName);
        return this._getMountPointFromEngineInstance(engineInstance);
    }

    /**
     * Determines the mount point from an engine instance by reading its configuration.

     * @param {object} engineInstance - The instance of the engine.
     * @returns {string|null} The resolved mount point or null if the instance is undefined or the configuration is not set.
     * @private
     */
    _getMountPointFromEngineInstance(engineInstance) {
        if (engineInstance) {
            const config = engineInstance.resolveRegistration('config:environment');

            if (config) {
                let engineName = config.modulePrefix;
                let mountedEngineRoutePrefix = config.mountedEngineRoutePrefix;

                if (!mountedEngineRoutePrefix) {
                    mountedEngineRoutePrefix = this._mountPathFromEngineName(engineName);
                }

                if (!mountedEngineRoutePrefix.endsWith('.')) {
                    mountedEngineRoutePrefix = mountedEngineRoutePrefix + '.';
                }

                return mountedEngineRoutePrefix;
            }
        }

        return null;
    }

    /**
     * Extracts and formats the mount path from a given engine name.
     *
     * This function takes an engine name in the format '@scope/engine-name',
     * extracts the 'engine-name' part, removes the '-engine' suffix if present,
     * and formats it into a string that represents a console path.
     *
     * @param {string} engineName - The full name of the engine, typically in the format '@scope/engine-name'.
     * @returns {string} A string representing the console path derived from the engine name.
     * @example
     * // returns 'console.some'
     * _mountPathFromEngineName('@fleetbase/some-engine');
     */
    _mountPathFromEngineName(engineName) {
        let engineNameSegments = engineName.split('/');
        let mountName = engineNameSegments[1];

        if (typeof mountName !== 'string') {
            mountName = engineNameSegments[0];
        }

        const mountPath = mountName.replace('-engine', '');
        return `console.${mountPath}`;
    }

    /**
     * Refreshes the current route.
     *
     * This action is a simple wrapper around the router's refresh method. It can be used to re-run the
     * model hooks and reset the controller properties on the current route, effectively reloading the route.
     * This is particularly useful in scenarios where the route needs to be reloaded due to changes in
     * state or data.
     *
     * @returns {Promise} A Promise that resolves with the result of the router's refresh method.
     *
     * @example
     * // To refresh the current route
     * this.refreshRoute();
     */
    @action refreshRoute() {
        return this.router.refresh();
    }

    /**
     * Action to transition to a specified route based on the provided menu item.
     *
     * The route transition will include the 'slug' as a dynamic segment, and
     * the 'view' as an optional dynamic segment if it is defined.
     *
     * @action
     * @memberof UniverseService
     * @param {string} route - The target route to transition to.
     * @param {Object} menuItem - The menu item containing the transition parameters.
     * @param {string} menuItem.slug - The 'slug' dynamic segment for the route.
     * @param {string} [menuItem.view] - The 'view' dynamic segment for the route, if applicable.
     *
     * @returns {Transition} Returns a Transition object representing the transition to the route.
     */
    @action transitionMenuItem(route, menuItem) {
        const { slug, view, section } = menuItem;

        if (section && slug && view) {
            return this.router.transitionTo(route, section, slug, { queryParams: { view } });
        }

        if (section && slug) {
            return this.router.transitionTo(route, section, slug);
        }

        if (slug && view) {
            return this.router.transitionTo(route, slug, { queryParams: { view } });
        }

        return this.router.transitionTo(route, slug);
    }

    /**
     * Redirects to a virtual route if a corresponding menu item exists based on the current URL slug.
     *
     * This asynchronous function checks whether a virtual route exists by extracting the slug from the current
     * window's pathname and looking up a matching menu item in a specified registry. If a matching menu item
     * is found, it initiates a transition to the given route associated with that menu item and returns the
     * transition promise.
     *
     * @async
     *
     * @param {Object} transition - The current transition object from the router.
     *   Used to retrieve additional information required for the menu item lookup.
     * @param {string} registryName - The name of the registry to search for the menu item.
     *   This registry should contain menu items mapped by their slugs.
     * @param {string} route - The name of the route to transition to if the menu item is found.
     *   This is typically the route associated with displaying the menu item's content.
     *
     * @returns {Promise|undefined} - Returns a promise that resolves when the route transition completes
     *   if a matching menu item is found. If no matching menu item is found, the function returns undefined.
     *
     */
    async virtualRouteRedirect(transition, registryName, route, options = {}) {
        const view = this.getViewFromTransition(transition);
        const slug = window.location.pathname.replace('/', '');
        const queryParams = this.urlSearchParams.all();
        const menuItem = await this.lookupMenuItemFromRegistry(registryName, slug, view);
        if (menuItem && transition.from === null) {
            return this.transitionMenuItem(route, menuItem, { queryParams }).then((transition) => {
                if (options && options.restoreQueryParams === true) {
                    this.urlSearchParams.setParamsToCurrentUrl(queryParams);
                }

                return transition;
            });
        }
    }

    /**
     * @action
     * Creates a new registry with the given name and options.
    
     * @memberof UniverseService
     * @param {string} registryName - The name of the registry to create.
     * @param {Object} [options={}] - Optional settings for the registry.
     * @param {Array} [options.menuItems=[]] - An array of menu items for the registry.
     * @param {Array} [options.menuPanel=[]] - An array of menu panels for the registry.
     *
     * @fires registry.created - Event triggered when a new registry is created.
     *
     * @returns {UniverseService} Returns the current UniverseService for chaining.
     *
     * @example
     * createRegistry('myRegistry', { menuItems: ['item1', 'item2'], menuPanel: ['panel1', 'panel2'] });
     */
    @action createRegistry(registryName, options = {}) {
        const internalRegistryName = this.createInternalRegistryName(registryName);

        if (this[internalRegistryName] == undefined) {
            this[internalRegistryName] = {
                name: registryName,
                menuItems: [],
                menuPanels: [],
                renderableComponents: [],
                ...options,
            };
        } else {
            this[internalRegistryName] = {
                ...this[internalRegistryName],
                ...options,
            };
        }

        // trigger registry created event
        this.trigger('registry.created', this[internalRegistryName]);

        return this;
    }

    /**
     * Creates multiple registries from a given array of registries. Each registry can be either a string or an array.
     * If a registry is an array, it expects two elements: the registry name (string) and registry options (object).
     * If a registry is a string, only the registry name is needed.
     *
     * The function iterates over each element in the `registries` array and creates a registry using the `createRegistry` method.
     * It supports two types of registry definitions:
     * 1. Array format: [registryName, registryOptions] - where registryOptions is an optional object.
     * 2. String format: "registryName" - in this case, only the name is provided and the registry is created with default options.
     *
     * @param {Array} registries - An array of registries to be created. Each element can be either a string or an array.
     * @action
     * @memberof YourComponentOrClassName
     */
    @action createRegistries(registries = []) {
        if (!isArray(registries)) {
            throw new Error('`createRegistries()` method must take an array.');
        }

        for (let i = 0; i < registries.length; i++) {
            const registry = registries[i];

            if (isArray(registry) && registry.length === 2) {
                let registryName = registry[0];
                let registryOptions = registry[1] ?? {};

                this.createRegistry(registryName, registryOptions);
                continue;
            }

            if (typeof registry === 'string') {
                this.createRegistry(registry);
            }
        }
    }

    /**
     * Triggers an event on for a universe registry.
     *
     * @memberof UniverseService
     * @method createRegistryEvent
     * @param {string} registryName - The name of the registry to trigger the event on.
     * @param {string} event - The name of the event to trigger.
     * @param {...*} params - Additional parameters to pass to the event handler.
     */
    @action createRegistryEvent(registryName, event, ...params) {
        this.trigger(`${registryName}.${event}`, ...params);
    }

    /**
     * @action
     * Retrieves the entire registry with the given name.
     *
     * @memberof UniverseService
     * @param {string} registryName - The name of the registry to retrieve.
     *
     * @returns {Object|null} Returns the registry object if it exists; otherwise, returns null.
     *
     * @example
     * const myRegistry = getRegistry('myRegistry');
     */
    @action getRegistry(registryName) {
        const internalRegistryName = this.createInternalRegistryName(registryName);
        const registry = this[internalRegistryName];

        if (!isBlank(registry)) {
            return registry;
        }

        return null;
    }

    /**
     * Looks up a registry by its name and returns it as a Promise.
     *
     * @memberof UniverseService
     * @param {string} registryName - The name of the registry to look up.
     *
     * @returns {Promise<Object|null>} A Promise that resolves to the registry object if it exists; otherwise, rejects with null.
     *
     * @example
     * lookupRegistry('myRegistry')
     *   .then((registry) => {
     *     // Do something with the registry
     *   })
     *   .catch((error) => {
     *     // Handle the error or absence of the registry
     *   });
     */
    lookupRegistry(registryName) {
        const internalRegistryName = this.createInternalRegistryName(registryName);
        const registry = this[internalRegistryName];

        return new Promise((resolve, reject) => {
            if (!isBlank(registry)) {
                return resolve(registry);
            }

            later(
                this,
                () => {
                    if (!isBlank(registry)) {
                        return resolve(registry);
                    }
                },
                100
            );

            reject(null);
        });
    }

    /**
     * @action
     * Retrieves the menu items from a registry with the given name.
     *
     * @memberof UniverseService
     * @param {string} registryName - The name of the registry to retrieve menu items from.
     *
     * @returns {Array} Returns an array of menu items if the registry exists and has menu items; otherwise, returns an empty array.
     *
     * @example
     * const items = getMenuItemsFromRegistry('myRegistry');
     */
    @action getMenuItemsFromRegistry(registryName) {
        const internalRegistryName = this.createInternalRegistryName(registryName);
        const registry = this[internalRegistryName];

        if (!isBlank(registry) && isArray(registry.menuItems)) {
            return registry.menuItems;
        }

        return [];
    }

    /**
     * @action
     * Retrieves the menu panels from a registry with the given name.
     *
     * @memberof UniverseService
     * @param {string} registryName - The name of the registry to retrieve menu panels from.
     *
     * @returns {Array} Returns an array of menu panels if the registry exists and has menu panels; otherwise, returns an empty array.
     *
     * @example
     * const panels = getMenuPanelsFromRegistry('myRegistry');
     */
    @action getMenuPanelsFromRegistry(registryName) {
        const internalRegistryName = this.createInternalRegistryName(registryName);
        const registry = this[internalRegistryName];

        if (!isBlank(registry) && isArray(registry.menuPanels)) {
            return registry.menuPanels;
        }

        return [];
    }

    /**
     * Retrieves renderable components from a specified registry.
     * This action checks the internal registry, identified by the given registry name,
     * and returns the 'renderableComponents' if they are present and are an array.
     *
     * @action
     * @param {string} registryName - The name of the registry to retrieve components from.
     * @returns {Array} An array of renderable components from the specified registry, or an empty array if none found.
     */
    @action getRenderableComponentsFromRegistry(registryName) {
        const internalRegistryName = this.createInternalRegistryName(registryName);
        const registry = this[internalRegistryName];

        if (!isBlank(registry) && isArray(registry.renderableComponents)) {
            return registry.renderableComponents;
        }

        return [];
    }

    /**
     * Loads a component from the specified registry based on a given slug and view.
     *
     * @param {string} registryName - The name of the registry where the component is located.
     * @param {string} slug - The slug of the menu item.
     * @param {string} [view=null] - The view of the menu item, if applicable.
     *
     * @returns {Promise} Returns a Promise that resolves with the component if it is found, or null.
     */
    loadComponentFromRegistry(registryName, slug, view = null) {
        const internalRegistryName = this.createInternalRegistryName(registryName);
        const registry = this[internalRegistryName];

        return new Promise((resolve) => {
            let component = null;

            if (isBlank(registry)) {
                return resolve(component);
            }

            // check menu items first
            for (let i = 0; i < registry.menuItems.length; i++) {
                const menuItem = registry.menuItems[i];

                // no view hack
                if (menuItem && menuItem.slug === slug && menuItem.view === null && view === 'index') {
                    component = menuItem.component;
                    break;
                }

                if (menuItem && menuItem.slug === slug && menuItem.view === view) {
                    component = menuItem.component;
                    break;
                }
            }

            // check menu panels
            for (let i = 0; i < registry.menuPanels.length; i++) {
                const menuPanel = registry.menuPanels[i];

                if (menuPanel && isArray(menuPanel.items)) {
                    for (let j = 0; j < menuPanel.items.length; j++) {
                        const menuItem = menuPanel.items[j];

                        // no view hack
                        if (menuItem && menuItem.slug === slug && menuItem.view === null && view === 'index') {
                            component = menuItem.component;
                            break;
                        }

                        if (menuItem && menuItem.slug === slug && menuItem.view === view) {
                            component = menuItem.component;
                            break;
                        }
                    }
                }
            }

            resolve(component);
        });
    }

    /**
     * Looks up a menu item from the specified registry based on a given slug and view.
     *
     * @param {string} registryName - The name of the registry where the menu item is located.
     * @param {string} slug - The slug of the menu item.
     * @param {string} [view=null] - The view of the menu item, if applicable.
     * @param {string} [section=null] - The section of the menu item, if applicable.
     *
     * @returns {Promise} Returns a Promise that resolves with the menu item if it is found, or null.
     */
    lookupMenuItemFromRegistry(registryName, slug, view = null, section = null) {
        const internalRegistryName = this.createInternalRegistryName(registryName);
        const registry = this[internalRegistryName];

        return new Promise((resolve) => {
            let foundMenuItem = null;

            if (isBlank(registry)) {
                return resolve(foundMenuItem);
            }

            // check menu items first
            for (let i = 0; i < registry.menuItems.length; i++) {
                const menuItem = registry.menuItems[i];

                if (menuItem && menuItem.slug === slug && menuItem.section === section && menuItem.view === view) {
                    foundMenuItem = menuItem;
                    break;
                }

                if (menuItem && menuItem.slug === slug && menuItem.view === view) {
                    foundMenuItem = menuItem;
                    break;
                }
            }

            // check menu panels
            for (let i = 0; i < registry.menuPanels.length; i++) {
                const menuPanel = registry.menuPanels[i];

                if (menuPanel && isArray(menuPanel.items)) {
                    for (let j = 0; j < menuPanel.items.length; j++) {
                        const menuItem = menuPanel.items[j];

                        if (menuItem && menuItem.slug === slug && menuItem.section === section && menuItem.view === view) {
                            foundMenuItem = menuItem;
                            break;
                        }

                        if (menuItem && menuItem.slug === slug && menuItem.view === view) {
                            foundMenuItem = menuItem;
                            break;
                        }
                    }
                }
            }

            resolve(foundMenuItem);
        });
    }

    /**
     * Gets the view param from the transition object.
     *
     * @param {Transition} transition
     * @return {String|Null}
     * @memberof UniverseService
     */
    getViewFromTransition(transition) {
        const queryParams = transition.to.queryParams ?? { view: null };
        return queryParams.view;
    }

    /**
     * Creates an internal registry name for hooks based on a given registry name.
     * The registry name is transformed to camel case and appended with 'Hooks'.
     * Non-alphanumeric characters are replaced with hyphens.
     *
     * @param {string} registryName - The name of the registry for which to create an internal hook registry name.
     * @returns {string} - The internal hook registry name, formatted as camel case with 'Hooks' appended.
     */
    createInternalHookRegistryName(registryName) {
        return `${camelize(registryName.replace(/[^a-zA-Z0-9]/g, '-'))}Hooks`;
    }

    /**
     * Registers a hook function under a specified registry name.
     * The hook is stored in an internal registry, and its hash is computed for identification.
     * If the hook is already registered, it is appended to the existing list of hooks.
     *
     * @param {string} registryName - The name of the registry where the hook should be registered.
     * @param {Function} hook - The hook function to be registered.
     */
    registerHook(registryName, hook) {
        if (typeof hook !== 'function') {
            throw new Error('The hook must be a function.');
        }

        // no duplicate hooks
        if (this.didRegisterHook(registryName, hook)) {
            return;
        }

        const internalHookRegistryName = this.createInternalHookRegistryName(registryName);
        const hookRegistry = this.hooks[internalHookRegistryName] || [];
        hookRegistry.pushObject({ id: this._createHashFromFunctionDefinition(hook), hook });

        this.hooks[internalHookRegistryName] = hookRegistry;
    }

    /**
     * Checks if a hook was registered already.
     *
     * @param {String} registryName
     * @param {Function} hook
     * @return {Boolean}
     * @memberof UniverseService
     */
    didRegisterHook(registryName, hook) {
        const hooks = this.getHooks(registryName);
        const hookId = this._createHashFromFunctionDefinition(hook);
        return isArray(hooks) && hooks.some((h) => h.id === hookId);
    }

    /**
     * Retrieves the list of hooks registered under a specified registry name.
     * If no hooks are registered, returns an empty array.
     *
     * @param {string} registryName - The name of the registry for which to retrieve hooks.
     * @returns {Array<Object>} - An array of hook objects registered under the specified registry name.
     * Each object contains an `id` and a `hook` function.
     */
    getHooks(registryName) {
        const internalHookRegistryName = this.createInternalHookRegistryName(registryName);
        return this.hooks[internalHookRegistryName] ?? [];
    }

    /**
     * Executes all hooks registered under a specified registry name with the given parameters.
     * Each hook is called with the provided parameters.
     *
     * @param {string} registryName - The name of the registry under which hooks should be executed.
     * @param {...*} params - The parameters to pass to each hook function.
     */
    executeHooks(registryName, ...params) {
        const hooks = this.getHooks(registryName);
        hooks.forEach(({ hook }) => {
            try {
                hook(...params);
            } catch (error) {
                debug(`Error executing hook: ${error}`);
            }
        });
    }

    /**
     * Calls all hooks registered under a specified registry name with the given parameters.
     * This is an alias for `executeHooks` for consistency in naming.
     *
     * @param {string} registryName - The name of the registry under which hooks should be called.
     * @param {...*} params - The parameters to pass to each hook function.
     */
    callHooks(registryName, ...params) {
        this.executeHooks(registryName, ...params);
    }

    /**
     * Calls a specific hook identified by its ID under a specified registry name with the given parameters.
     * Only the hook with the matching ID is executed.
     *
     * @param {string} registryName - The name of the registry where the hook is registered.
     * @param {string} hookId - The unique identifier of the hook to be called.
     * @param {...*} params - The parameters to pass to the hook function.
     */
    callHook(registryName, hookId, ...params) {
        const hooks = this.getHooks(registryName);
        const hook = hooks.find((h) => h.id === hookId);

        if (hook) {
            try {
                hook.hook(...params);
            } catch (error) {
                debug(`Error executing hook: ${error}`);
            }
        } else {
            warn(`Hook with ID ${hookId} not found.`);
        }
    }

    /**
     * Registers a renderable component or an array of components into a specified registry.
     * If a single component is provided, it is registered directly.
     * If an array of components is provided, each component in the array is registered individually.
     * The component is also registered into the specified engine.
     *
     * @param {string} engineName - The name of the engine to register the component(s) into.
     * @param {string} registryName - The registry name where the component(s) should be registered.
     * @param {Object|Array} component - The component or array of components to register.
     */
    registerRenderableComponent(engineName, registryName, component) {
        if (isArray(component)) {
            component.forEach((_) => this.registerRenderableComponent(registryName, _));
            return;
        }

        // register component to engine
        this.registerComponentInEngine(engineName, component);

        // register to registry
        const internalRegistryName = this.createInternalRegistryName(registryName);
        if (!isBlank(this[internalRegistryName])) {
            if (isArray(this[internalRegistryName].renderableComponents)) {
                this[internalRegistryName].renderableComponents.pushObject(component);
            } else {
                this[internalRegistryName].renderableComponents = [component];
            }
        } else {
            this.createRegistry(registryName);
            return this.registerRenderableComponent(...arguments);
        }
    }

    /**
     * Registers a new menu panel in a registry.
     *
     * @method registerMenuPanel
     * @public
     * @memberof UniverseService
     * @param {String} registryName The name of the registry to use
     * @param {String} title The title of the panel
     * @param {Array} items The items of the panel
     * @param {Object} options Additional options for the panel
     */
    registerMenuPanel(registryName, title, items = [], options = {}) {
        const internalRegistryName = this.createInternalRegistryName(registryName);
        const intl = this._getOption(options, 'intl', null);
        const open = this._getOption(options, 'open', true);
        const slug = this._getOption(options, 'slug', dasherize(title));
        const menuPanel = {
            intl,
            title,
            open,
            items: items.map(({ title, route, ...options }) => {
                options.slug = slug;
                options.view = dasherize(title);

                return this._createMenuItem(title, route, options);
            }),
        };

        // register menu panel
        this[internalRegistryName].menuPanels.pushObject(menuPanel);

        // trigger menu panel registered event
        this.trigger('menuPanel.registered', menuPanel, this[internalRegistryName]);
    }

    /**
     * Registers a new menu item in a registry.
     *
     * @method registerMenuItem
     * @public
     * @memberof UniverseService
     * @param {String} registryName The name of the registry to use
     * @param {String} title The title of the item
     * @param {String} route The route of the item
     * @param {Object} options Additional options for the item
     */
    registerMenuItem(registryName, title, options = {}) {
        const internalRegistryName = this.createInternalRegistryName(registryName);
        const route = this._getOption(options, 'route', `console.${dasherize(registryName)}.virtual`);
        options.slug = this._getOption(options, 'slug', '~');
        options.view = this._getOption(options, 'view', dasherize(title));

        // not really a fan of assumptions, but will do this for the timebeing till anyone complains
        if (options.slug === options.view) {
            options.view = null;
        }

        // register component if applicable
        this.registerMenuItemComponentToEngine(options);

        // create menu item
        const menuItem = this._createMenuItem(title, route, options);

        // register menu item
        if (!this[internalRegistryName]) {
            this[internalRegistryName] = {
                menuItems: [],
                menuPanels: [],
            };
        }

        // register menu item
        this[internalRegistryName].menuItems.pushObject(menuItem);

        // trigger menu panel registered event
        this.trigger('menuItem.registered', menuItem, this[internalRegistryName]);
    }

    /**
     * Register multiple menu items to a registry.
     *
     * @param {String} registryName
     * @param {Array} [menuItems=[]]
     * @memberof UniverseService
     */
    registerMenuItems(registryName, menuItems = []) {
        for (let i = 0; i < menuItems.length; i++) {
            const menuItem = menuItems[i];
            if (menuItem && menuItem.title) {
                if (menuItem.options) {
                    this.registerMenuItem(registryName, menuItem.title, menuItem.options);
                } else {
                    this.registerMenuItem(registryName, menuItem.title, menuItem);
                }
            }
        }
    }

    /**
     * Registers a menu item's component to one or multiple engines.
     *
     * @method registerMenuItemComponentToEngine
     * @public
     * @memberof UniverseService
     * @param {Object} options - An object containing the following properties:
     *   - `registerComponentToEngine`: A string or an array of strings representing the engine names where the component should be registered.
     *   - `component`: The component class to register, which should have a 'name' property.
     */
    registerMenuItemComponentToEngine(options) {
        // Register component if applicable
        if (typeof options.registerComponentToEngine === 'string') {
            this.registerComponentInEngine(options.registerComponentToEngine, options.component);
        }

        // register to multiple engines
        if (isArray(options.registerComponentToEngine)) {
            for (let i = 0; i < options.registerComponentInEngine.length; i++) {
                const engineName = options.registerComponentInEngine.objectAt(i);

                if (typeof engineName === 'string') {
                    this.registerComponentInEngine(engineName, options.component);
                }
            }
        }
    }

    /**
     * Registers a new administrative menu panel.
     *
     * @method registerAdminMenuPanel
     * @public
     * @memberof UniverseService
     * @param {String} title The title of the panel
     * @param {Array} items The items of the panel
     * @param {Object} options Additional options for the panel
     */
    registerAdminMenuPanel(title, items = [], options = {}) {
        options.section = this._getOption(options, 'section', 'admin');
        this.registerMenuPanel('console:admin', title, items, options);
    }

    /**
     * Registers a new administrative menu item.
     *
     * @method registerAdminMenuItem
     * @public
     * @memberof UniverseService
     * @param {String} title The title of the item
     * @param {Object} options Additional options for the item
     */
    registerAdminMenuItem(title, options = {}) {
        this.registerMenuItem('console:admin', title, options);
    }

    /**
     * Registers a new settings menu panel.
     *
     * @method registerSettingsMenuPanel
     * @public
     * @memberof UniverseService
     * @param {String} title The title of the panel
     * @param {Array} items The items of the panel
     * @param {Object} options Additional options for the panel
     */
    registerSettingsMenuPanel(title, items = [], options = {}) {
        this.registerMenuPanel('console:settings', title, items, options);
    }

    /**
     * Registers a new settings menu item.
     *
     * @method registerSettingsMenuItem
     * @public
     * @memberof UniverseService
     * @param {String} title The title of the item
     * @param {Object} options Additional options for the item
     */
    registerSettingsMenuItem(title, options = {}) {
        this.registerMenuItem('console:settings', title, options);
    }

    /**
     * Registers a new account menu panel.
     *
     * @method registerAccountMenuPanel
     * @public
     * @memberof UniverseService
     * @param {String} title The title of the panel
     * @param {Array} items The items of the panel
     * @param {Object} options Additional options for the panel
     */
    registerAccountMenuPanel(title, items = [], options = {}) {
        this.registerMenuPanel('console:account', title, items, options);
    }

    /**
     * Registers a new account menu item.
     *
     * @method registerAccountMenuItem
     * @public
     * @memberof UniverseService
     * @param {String} title The title of the item
     * @param {Object} options Additional options for the item
     */
    registerAccountMenuItem(title, options = {}) {
        this.registerMenuItem('console:account', title, options);
    }

    /**
     * Registers a new dashboard with the given name.
     * Initializes the dashboard with empty arrays for default widgets and widgets.
     *
     * @param {string} dashboardName - The name of the dashboard to register.
     * @returns {void}
     */
    registerDashboard(dashboardName) {
        const internalDashboardRegistryName = this.createInternalDashboardName(dashboardName);
        if (this[internalDashboardRegistryName] !== undefined) {
            return;
        }

        this[internalDashboardRegistryName] = {
            defaultWidgets: A([]),
            widgets: A([]),
        };

        this.trigger('dashboard.registered', this[internalDashboardRegistryName]);
    }

    /**
     * Retrieves the registry for a specific dashboard.
     *
     * @param {string} dashboardName - The name of the dashboard to get the registry for.
     * @returns {Object} - The registry object for the specified dashboard, including default and registered widgets.
     */
    getDashboardRegistry(dashboardName) {
        const internalDashboardRegistryName = this.createInternalDashboardName(dashboardName);
        return this[internalDashboardRegistryName];
    }

    /**
     * Checks if a dashboard has been registered.
     *
     * @param {String} dashboardName
     * @return {Boolean}
     * @memberof UniverseService
     */
    didRegisterDashboard(dashboardName) {
        const internalDashboardRegistryName = this.createInternalDashboardName(dashboardName);
        return this[internalDashboardRegistryName] !== undefined;
    }

    /**
     * Retrieves the widget registry for a specific dashboard and type.
     *
     * @param {string} dashboardName - The name of the dashboard to get the widget registry for.
     * @param {string} [type='widgets'] - The type of widget registry to retrieve (e.g., 'widgets', 'defaultWidgets').
     * @returns {Array} - An array of widget objects for the specified dashboard and type.
     */
    getWidgetRegistry(dashboardName, type = 'widgets') {
        const internalDashboardRegistryName = this.createInternalDashboardName(dashboardName);
        const typeKey = pluralize(type);
        return isArray(this[internalDashboardRegistryName][typeKey]) ? this[internalDashboardRegistryName][typeKey] : [];
    }

    /**
     * Registers widgets for a specific dashboard.
     * Supports registering multiple widgets and different types of widget collections.
     *
     * @param {string} dashboardName - The name of the dashboard to register widgets for.
     * @param {Array|Object} widgets - An array of widget objects or a single widget object to register.
     * @param {string} [type='widgets'] - The type of widgets to register (e.g., 'widgets', 'defaultWidgets').
     * @returns {void}
     */
    registerWidgets(dashboardName, widgets = [], type = 'widgets') {
        const internalDashboardRegistryName = this.createInternalDashboardName(dashboardName);
        if (isArray(widgets)) {
            widgets.forEach((w) => this.registerWidgets(dashboardName, w, type));
            return;
        }

        const typeKey = pluralize(type);
        const newWidget = this._createDashboardWidget(widgets);
        const widgetRegistry = this.getWidgetRegistry(dashboardName, type);
        if (this.widgetRegistryHasWidget(widgetRegistry, newWidget)) {
            return;
        }

        this[internalDashboardRegistryName][typeKey] = [...widgetRegistry, newWidget];
        this.trigger('widget.registered', newWidget);
    }

    /**
     * Checks if a widget with the same ID as the pending widget is already registered in the specified dashboard and type.
     *
     * @param {string} dashboardName - The name of the dashboard to check.
     * @param {Object} widgetPendingRegistry - The widget to check for in the registry.
     * @param {string} [type='widgets'] - The type of widget registry to check (e.g., 'widgets', 'defaultWidgets').
     * @returns {boolean} - `true` if a widget with the same ID is found in the registry; otherwise, `false`.
     */
    didRegisterWidget(dashboardName, widgetPendingRegistry, type = 'widgets') {
        const widgetRegistry = this.getWidgetRegistry(dashboardName, type);
        return widgetRegistry.includes((widget) => widget.widgetId === widgetPendingRegistry.widgetId);
    }

    /**
     * Checks if a widget with the same ID as the pending widget exists in the provided widget registry instance.
     *
     * @param {Array} [widgetRegistryInstance=[]] - An array of widget objects to check.
     * @param {Object} widgetPendingRegistry - The widget to check for in the registry.
     * @returns {boolean} - `true` if a widget with the same ID is found in the registry; otherwise, `false`.
     */
    widgetRegistryHasWidget(widgetRegistryInstance = [], widgetPendingRegistry) {
        return widgetRegistryInstance.includes((widget) => widget.widgetId === widgetPendingRegistry.widgetId);
    }

    /**
     * Registers widgets for the default 'dashboard' dashboard.
     *
     * @param {Array} [widgets=[]] - An array of widget objects to register.
     * @returns {void}
     */
    registerDashboardWidgets(widgets = []) {
        this.registerWidgets('dashboard', widgets);
    }

    /**
     * Registers default widgets for the default 'dashboard' dashboard.
     *
     * @param {Array} [widgets=[]] - An array of default widget objects to register.
     * @returns {void}
     */
    registerDefaultDashboardWidgets(widgets = []) {
        this.registerWidgets('dashboard', widgets, 'defaultWidgets');
    }

    /**
     * Registers default widgets for a specified dashboard.
     *
     * @param {String} dashboardName
     * @param {Array} [widgets=[]] - An array of default widget objects to register.
     * @returns {void}
     */
    registerDefaultWidgets(dashboardName, widgets = []) {
        this.registerWidgets(dashboardName, widgets, 'defaultWidgets');
    }

    /**
     * Retrieves widgets for a specific dashboard.
     *
     * @param {string} dashboardName - The name of the dashboard to retrieve widgets for.
     * @param {string} [type='widgets'] - The type of widgets to retrieve (e.g., 'widgets', 'defaultWidgets').
     * @returns {Array} - An array of widgets for the specified dashboard and type.
     */
    getWidgets(dashboardName, type = 'widgets') {
        const typeKey = pluralize(type);
        const internalDashboardRegistryName = this.createInternalDashboardName(dashboardName);
        return isArray(this[internalDashboardRegistryName][typeKey]) ? this[internalDashboardRegistryName][typeKey] : [];
    }

    /**
     * Retrieves default widgets for a specific dashboard.
     *
     * @param {string} dashboardName - The name of the dashboard to retrieve default widgets for.
     * @returns {Array} - An array of default widgets for the specified dashboard.
     */
    getDefaultWidgets(dashboardName) {
        return this.getWidgets(dashboardName, 'defaultWidgets');
    }

    /**
     * Retrieves widgets for the default 'dashboard' dashboard.
     *
     * @returns {Array} - An array of widgets for the default 'dashboard' dashboard.
     */
    getDashboardWidgets() {
        return this.getWidgets('dashboard');
    }

    /**
     * Retrieves default widgets for the default 'dashboard' dashboard.
     *
     * @returns {Array} - An array of default widgets for the default 'dashboard' dashboard.
     */
    getDefaultDashboardWidgets() {
        return this.getWidgets('dashboard', 'defaultWidgets');
    }

    /**
     * Creates an internal name for a dashboard based on its given name.
     *
     * @param {string} dashboardName - The name of the dashboard.
     * @returns {string} - The internal name for the dashboard, formatted as `${dashboardName}Widgets`.
     */
    createInternalDashboardName(dashboardName) {
        return `${camelize(dashboardName.replace(/[^a-zA-Z0-9]/g, '-'))}Widgets`;
    }

    /**
     * Creates a new widget object from a widget definition.
     * If the component is a function, it is registered with the host application.
     *
     * @param {Object} widget - The widget definition.
     * @param {string} widget.widgetId - The unique ID of the widget.
     * @param {string} widget.name - The name of the widget.
     * @param {string} [widget.description] - A description of the widget.
     * @param {string} [widget.icon] - An icon for the widget.
     * @param {Function|string} [widget.component] - A component definition or name for the widget.
     * @param {Object} [widget.grid_options] - Grid options for the widget.
     * @param {Object} [widget.options] - Additional options for the widget.
     * @returns {Object} - The newly created widget object.
     */
    _createDashboardWidget(widget) {
        // Extract properties from the widget object
        let { widgetId, name, description, icon, component, grid_options, options } = widget;

        // If component is a definition register to host application
        if (typeof component === 'function') {
            const owner = getOwner(this);
            widgetId = component.widgetId || widgetId || this._createUniqueWidgetHashFromDefinition(component);

            if (owner) {
                owner.register(`component:${widgetId}`, component);

                // Update component name
                component = widgetId;
            }
        }

        // Create a new widget object with the extracted properties
        const newWidget = {
            widgetId,
            name,
            description,
            icon,
            component,
            grid_options,
            options,
        };

        return newWidget;
    }

    /**
     * Generates a unique hash for a widget component based on its function definition.
     * This method delegates the hash creation to the `_createHashFromFunctionDefinition` method.
     *
     * @param {Function} component - The function representing the widget component.
     * @returns {string} - The unique hash representing the widget component.
     */
    _createUniqueWidgetHashFromDefinition(component) {
        return this._createHashFromFunctionDefinition(component);
    }

    /**
     * Creates a hash value from a function definition. The hash is generated based on the function's string representation.
     * If the function has a name, it returns that name. Otherwise, it converts the function's string representation
     * into a hash value. This is done by iterating over the characters of the string and performing a simple hash calculation.
     *
     * @param {Function} func - The function whose definition will be hashed.
     * @returns {string} - The hash value derived from the function's definition. If the function has a name, it is returned directly.
     */
    _createHashFromFunctionDefinition(func) {
        if (func.name) {
            return func.name;
        }

        if (typeof func.toString === 'function') {
            let definition = func.toString();
            let hash = 0;
            for (let i = 0; i < definition.length; i++) {
                const char = definition.charCodeAt(i);
                hash = (hash << 5) - hash + char;
                hash |= 0;
            }
            return hash.toString(16);
        }

        return func.name;
    }

    /**
     * Registers a new header menu item.
     *
     * @method registerHeaderMenuItem
     * @public
     * @memberof UniverseService
     * @param {String} title The title of the item
     * @param {String} route The route of the item
     * @param {Object} options Additional options for the item
     */
    registerHeaderMenuItem(title, route, options = {}) {
        this.headerMenuItems.pushObject(this._createMenuItem(title, route, options));
        this.headerMenuItems.sort((a, b) => a.priority - b.priority);
    }

    /**
     * Registers a new organization menu item.
     *
     * @method registerOrganizationMenuItem
     * @public
     * @memberof UniverseService
     * @param {String} title The title of the item
     * @param {String} route The route of the item
     * @param {Object} options Additional options for the item
     */
    registerOrganizationMenuItem(title, options = {}) {
        const route = this._getOption(options, 'route', 'console.virtual');
        options.index = this._getOption(options, 'index', 0);
        options.section = this._getOption(options, 'section', 'settings');

        this.organizationMenuItems.pushObject(this._createMenuItem(title, route, options));
    }

    /**
     * Registers a new organization menu item.
     *
     * @method registerOrganizationMenuItem
     * @public
     * @memberof UniverseService
     * @param {String} title The title of the item
     * @param {String} route The route of the item
     * @param {Object} options Additional options for the item
     */
    registerUserMenuItem(title, options = {}) {
        const route = this._getOption(options, 'route', 'console.virtual');
        options.index = this._getOption(options, 'index', 0);
        options.section = this._getOption(options, 'section', 'account');

        this.userMenuItems.pushObject(this._createMenuItem(title, route, options));
    }

    /**
     * Returns the value of a given key on a target object, with a default value.
     *
     * @method _getOption
     * @private
     * @memberof UniverseService
     * @param {Object} target The target object
     * @param {String} key The key to get value for
     * @param {*} defaultValue The default value if the key does not exist
     * @returns {*} The value of the key or default value
     */
    _getOption(target, key, defaultValue = null) {
        return target[key] !== undefined ? target[key] : defaultValue;
    }

    /**
     * Creates a new menu item with the provided information.
     *
     * @method _createMenuItem
     * @private
     * @memberof UniverseService
     * @param {String} title The title of the item
     * @param {String} route The route of the item
     * @param {Object} options Additional options for the item
     * @returns {Object} A new menu item object
     */
    _createMenuItem(title, route, options = {}) {
        const intl = this._getOption(options, 'intl', null);
        const priority = this._getOption(options, 'priority', 9);
        const icon = this._getOption(options, 'icon', 'circle-dot');
        const items = this._getOption(options, 'items');
        const component = this._getOption(options, 'component');
        const componentParams = this._getOption(options, 'componentParams', {});
        const renderComponentInPlace = this._getOption(options, 'renderComponentInPlace', false);
        const slug = this._getOption(options, 'slug', dasherize(title));
        const view = this._getOption(options, 'view', dasherize(title));
        const queryParams = this._getOption(options, 'queryParams', {});
        const index = this._getOption(options, 'index', 0);
        const onClick = this._getOption(options, 'onClick', null);
        const section = this._getOption(options, 'section', null);
        const iconComponent = this._getOption(options, 'iconComponent', null);
        const iconComponentOptions = this._getOption(options, 'iconComponentOptions', {});
        const iconSize = this._getOption(options, 'iconSize', null);
        const iconPrefix = this._getOption(options, 'iconPrefix', null);
        const iconClass = this._getOption(options, 'iconClass', null);
        const itemClass = this._getOption(options, 'class', null);
        const inlineClass = this._getOption(options, 'inlineClass', null);
        const wrapperClass = this._getOption(options, 'wrapperClass', null);
        const overwriteWrapperClass = this._getOption(options, 'overwriteWrapperClass', false);
        const id = this._getOption(options, 'id', dasherize(title));
        const type = this._getOption(options, 'type', null);
        const buttonType = this._getOption(options, 'buttonType', null);
        const permission = this._getOption(options, 'permission', null);
        const disabled = this._getOption(options, 'disabled', null);
        const isLoading = this._getOption(options, 'isLoading', null);

        // dasherize route segments
        if (typeof route === 'string') {
            route = route
                .split('.')
                .map((segment) => dasherize(segment))
                .join('.');
        }

        // @todo: create menu item class
        const menuItem = {
            id,
            intl,
            title,
            text: title,
            route,
            icon,
            priority,
            items,
            component,
            componentParams,
            renderComponentInPlace,
            slug,
            queryParams,
            view,
            index,
            section,
            onClick,
            iconComponent,
            iconComponentOptions,
            iconSize,
            iconPrefix,
            iconClass,
            class: itemClass,
            inlineClass,
            wrapperClass,
            overwriteWrapperClass,
            type,
            buttonType,
            permission,
            disabled,
            isLoading,
        };

        // make the menu item and universe object a default param of the onClick handler
        if (typeof onClick === 'function') {
            const universe = this;
            menuItem.onClick = function () {
                return onClick(menuItem, universe);
            };
        }

        return menuItem;
    }

    /**
     * Creates an internal registry name by camelizing the provided registry name and appending "Registry" to it.
     *
     * @method createInternalRegistryName
     * @public
     * @memberof UniverseService
     * @param {String} registryName - The name of the registry to be camelized and formatted.
     * @returns {String} The formatted internal registry name.
     */
    createInternalRegistryName(registryName) {
        return `${camelize(registryName.replace(/[^a-zA-Z0-9]/g, '-'))}Registry`;
    }

    /**
     * Registers a component class under one or more names within a specified engine instance.
     * This function provides flexibility in component registration by supporting registration under the component's
     * full class name, a simplified alias derived from the class name, and an optional custom name provided through the options.
     * This flexibility facilitates varied referencing styles within different parts of the application, enhancing modularity and reuse.
     *
     * @param {string} engineName - The name of the engine where the component will be registered.
     * @param {class} componentClass - The component class to be registered. Must be a class, not an instance.
     * @param {Object} [options] - Optional parameters for additional configuration.
     * @param {string} [options.registerAs] - A custom name under which the component can also be registered.
     *
     * @example
     * // Register a component with its default and alias names
     * registerComponentInEngine('mainEngine', HeaderComponent);
     *
     * // Additionally register the component under a custom name
     * registerComponentInEngine('mainEngine', HeaderComponent, { registerAs: 'header' });
     *
     * @remarks
     * - The function does not return any value.
     * - Registration only occurs if:
     *   - The specified engine instance exists.
     *   - The component class is properly defined with a non-empty name.
     *   - The custom name, if provided, must be a valid string.
     *   - Allows flexible component referencing by registering under multiple names.
     */
    registerComponentInEngine(engineName, componentClass, options = {}) {
        const engineInstance = this.getEngineInstance(engineName);
        this.registerComponentToEngineInstance(engineInstance, componentClass, options);
    }

    /**
     * Registers a component class under its full class name, a simplified alias, and an optional custom name within a specific engine instance.
     * This helper function does the actual registration of the component to the engine instance. It registers the component under its
     * full class name, a dasherized alias of the class name (with 'Component' suffix removed if present), and any custom name provided via options.
     *
     * @param {EngineInstance} engineInstance - The engine instance where the component will be registered.
     * @param {class} componentClass - The component class to be registered. This should be a class reference, not an instance.
     * @param {Object} [options] - Optional parameters for further configuration.
     * @param {string} [options.registerAs] - A custom name under which the component can be registered.
     *
     * @example
     * // Typical usage within the system (not usually called directly by users)
     * registerComponentToEngineInstance(engineInstance, HeaderComponent, { registerAs: 'header' });
     *
     * @remarks
     * - No return value.
     * - The registration is performed only if:
     *   - The engine instance is valid and not null.
     *   - The component class has a defined and non-empty name.
     *   - The custom name, if provided, is a valid string.
     * - This function directly manipulates the engine instance's registration map.
     */
    registerComponentToEngineInstance(engineInstance, componentClass, options = {}) {
        if (engineInstance && componentClass && typeof componentClass.name === 'string') {
            engineInstance.register(`component:${componentClass.name}`, componentClass);
            engineInstance.register(`component:${dasherize(componentClass.name.replace('Component', ''))}`, componentClass);
            if (options && typeof options.registerAs === 'string') {
                engineInstance.register(`component:${options.registerAs}`, componentClass);
                this.trigger('component.registered', componentClass, engineInstance);
            }
        }
    }

    /**
     * Registers a service from one engine instance to another within the application.
     * This method retrieves an instance of a service from the current engine and then registers it
     * in a target engine, allowing the service to be shared across different parts of the application.
     *
     * @param {string} targetEngineName - The name of the engine where the service should be registered.
     * @param {string} serviceName - The name of the service to be shared and registered.
     * @param {Object} currentEngineInstance - The engine instance that currently holds the service to be shared.
     *
     * @example
     * // Assuming 'appEngine' and 'componentEngine' are existing engine instances and 'logger' is a service in 'appEngine'
     * registerServiceInEngine('componentEngine', 'logger', appEngine);
     *
     * Note:
     * - This function does not return any value.
     * - It only performs registration if all provided parameters are valid:
     *   - Both engine instances must exist.
     *   - The service name must be a string.
     *   - The service must exist in the current engine instance.
     *   - The service is registered without instantiating a new copy in the target engine.
     */
    registerServiceInEngine(targetEngineName, serviceName, currentEngineInstance) {
        // Get the target engine instance
        const targetEngineInstance = this.getEngineInstance(targetEngineName);

        // Validate inputs
        if (targetEngineInstance && currentEngineInstance && typeof serviceName === 'string') {
            // Lookup the service instance from the current engine
            const sharedService = currentEngineInstance.lookup(`service:${serviceName}`);

            if (sharedService) {
                // Register the service in the target engine
                targetEngineInstance.register(`service:${serviceName}`, sharedService, { instantiate: false });
                this.trigger('service.registered', serviceName, targetEngineInstance);
            }
        }
    }

    /**
     * Retrieves a service instance from a specified Ember engine.
     *
     * @param {string} engineName - The name of the engine from which to retrieve the service.
     * @param {string} serviceName - The name of the service to retrieve.
     * @returns {Object|null} The service instance if found, otherwise null.
     *
     * @example
     * const userService = universe.getServiceFromEngine('user-engine', 'user');
     * if (userService) {
     *   userService.doSomething();
     * }
     */
    getServiceFromEngine(engineName, serviceName, options = {}) {
        const engineInstance = this.getEngineInstance(engineName);

        if (engineInstance && typeof serviceName === 'string') {
            const serviceInstance = engineInstance.lookup(`service:${serviceName}`);
            if (options && options.inject) {
                for (let injectionName in options.inject) {
                    serviceInstance[injectionName] = options.inject[injectionName];
                }
            }
            return serviceInstance;
        }

        return null;
    }

    /**
     * Load the specified engine. If it is not loaded yet, it will use assetLoader
     * to load it and then register it to the router.
     *
     * @method loadEngine
     * @public
     * @memberof UniverseService
     * @param {String} name The name of the engine to load
     * @returns {Promise} A promise that resolves with the constructed engine instance
     */
    loadEngine(name) {
        const router = getOwner(this).lookup('router:main');
        const instanceId = 'manual'; // Arbitrary instance id, should be unique per engine
        const mountPoint = this._mountPathFromEngineName(name); // No mount point for manually loaded engines

        if (!router._enginePromises[name]) {
            router._enginePromises[name] = Object.create(null);
        }

        let enginePromise = router._enginePromises[name][instanceId];

        // We already have a Promise for this engine instance
        if (enginePromise) {
            return enginePromise;
        }

        if (router._engineIsLoaded(name)) {
            // The Engine is loaded, but has no Promise
            enginePromise = RSVP.resolve();
        } else {
            // The Engine is not loaded and has no Promise
            enginePromise = router._assetLoader.loadBundle(name).then(
                () => router._registerEngine(name),
                (error) => {
                    router._enginePromises[name][instanceId] = undefined;
                    throw error;
                }
            );
        }

        return (router._enginePromises[name][instanceId] = enginePromise.then(() => {
            return this.constructEngineInstance(name, instanceId, mountPoint);
        }));
    }

    /**
     * Construct an engine instance. If the instance does not exist yet, it will be created.
     *
     * @method constructEngineInstance
     * @public
     * @memberof UniverseService
     * @param {String} name The name of the engine
     * @param {String} instanceId The id of the engine instance
     * @param {String} mountPoint The mount point of the engine
     * @returns {Promise} A promise that resolves with the constructed engine instance
     */
    constructEngineInstance(name, instanceId, mountPoint) {
        const owner = getOwner(this);

        assert("You attempted to load the engine '" + name + "', but the engine cannot be found.", owner.hasRegistration(`engine:${name}`));

        let engineInstances = owner.lookup('router:main')._engineInstances;
        if (!engineInstances[name]) {
            engineInstances[name] = Object.create(null);
        }

        let engineInstance = owner.buildChildEngineInstance(name, {
            routable: true,
            mountPoint,
        });

        // correct mountPoint using engine instance
        let _mountPoint = this._getMountPointFromEngineInstance(engineInstance);
        if (_mountPoint) {
            engineInstance.mountPoint = _mountPoint;
        }

        // make sure to set dependencies from base instance
        if (engineInstance.base) {
            engineInstance.dependencies = this._setupEngineParentDependenciesBeforeBoot(engineInstance.base.dependencies);
        }

        // store loaded instance to engineInstances for booting
        engineInstances[name][instanceId] = engineInstance;

        this.trigger('engine.loaded', engineInstance);
        return engineInstance.boot().then(() => {
            return engineInstance;
        });
    }

    _setupEngineParentDependenciesBeforeBoot(baseDependencies = {}) {
        const dependencies = { ...baseDependencies };

        // fix services
        const servicesObject = {};
        if (isArray(dependencies.services)) {
            for (let i = 0; i < dependencies.services.length; i++) {
                const service = dependencies.services.objectAt(i);

                if (typeof service === 'object') {
                    Object.assign(servicesObject, service);
                    continue;
                }

                servicesObject[service] = service;
            }
        }

        // fix external routes
        const externalRoutesObject = {};
        if (isArray(dependencies.externalRoutes)) {
            for (let i = 0; i < dependencies.externalRoutes.length; i++) {
                const externalRoute = dependencies.externalRoutes.objectAt(i);

                if (typeof externalRoute === 'object') {
                    Object.assign(externalRoutesObject, externalRoute);
                    continue;
                }

                externalRoutesObject[externalRoute] = externalRoute;
            }
        }

        dependencies.externalRoutes = externalRoutesObject;
        dependencies.services = servicesObject;
        return dependencies;
    }

    /**
     * Retrieve an existing engine instance by its name and instanceId.
     *
     * @method getEngineInstance
     * @public
     * @memberof UniverseService
     * @param {String} name The name of the engine
     * @param {String} [instanceId='manual'] The id of the engine instance (defaults to 'manual')
     * @returns {Object|null} The engine instance if it exists, otherwise null
     */
    getEngineInstance(name, instanceId = 'manual') {
        const owner = getOwner(this);
        const router = owner.lookup('router:main');
        const engineInstances = router._engineInstances;

        if (engineInstances && engineInstances[name]) {
            return engineInstances[name][instanceId] || null;
        }

        return null;
    }

    /**
     * Returns a promise that resolves when the `enginesBooted` property is set to true.
     * The promise will reject with a timeout error if the property does not become true within the specified timeout.
     *
     * @function booting
     * @returns {Promise<void>} A promise that resolves when `enginesBooted` is true or rejects with an error after a timeout.
     */
    booting() {
        return new Promise((resolve, reject) => {
            const check = () => {
                if (this.enginesBooted === true) {
                    this.trigger('booted');
                    clearInterval(intervalId);
                    resolve();
                }
            };

            const intervalId = setInterval(check, 100);
            later(
                this,
                () => {
                    clearInterval(intervalId);
                    reject(new Error('Timeout: Universe was unable to boot engines'));
                },
                1000 * 40
            );
        });
    }

    /**
     * Boot all installed engines, ensuring dependencies are resolved.
     *
     * This method attempts to boot all installed engines by first checking if all
     * their dependencies are already booted. If an engine has dependencies that
     * are not yet booted, it is deferred and retried after its dependencies are
     * booted. If some dependencies are never booted, an error is logged.
     *
     * @method bootEngines
     * @param {ApplicationInstance|null} owner - The Ember ApplicationInstance that owns the engines.
     * @return {void}
     */
    async bootEngines(owner = null) {
        const booted = [];
        const pending = [];
        const additionalCoreExtensions = config.APP.extensions ?? [];

        // If no owner provided use the owner of this service
        if (owner === null) {
            owner = getOwner(this);
        }

        // Set application instance
        this.initialize();
        this.setApplicationInstance(owner);

        const tryBootEngine = (extension) => {
            return this.loadEngine(extension.name).then((engineInstance) => {
                if (engineInstance.base && engineInstance.base.setupExtension) {
                    if (this.bootedExtensions.includes(extension.name)) {
                        return;
                    }

                    const engineDependencies = getWithDefault(engineInstance.base, 'engineDependencies', []);
                    const allDependenciesBooted = engineDependencies.every((dep) => booted.includes(dep));

                    if (!allDependenciesBooted) {
                        pending.push({ extension, engineInstance });
                        return;
                    }

                    engineInstance.base.setupExtension(owner, engineInstance, this);
                    booted.push(extension.name);
                    this.bootedExtensions.pushObject(extension.name);
                    this.trigger('extension.booted', extension);
                    debug(`Booted : ${extension.name}`);

                    // Try booting pending engines again
                    tryBootPendingEngines();
                }
            });
        };

        const tryBootPendingEngines = () => {
            const stillPending = [];

            pending.forEach(({ extension, engineInstance }) => {
                if (this.bootedExtensions.includes(extension.name)) {
                    return;
                }

                const engineDependencies = getWithDefault(engineInstance.base, 'engineDependencies', []);
                const allDependenciesBooted = engineDependencies.every((dep) => booted.includes(dep));

                if (allDependenciesBooted) {
                    engineInstance.base.setupExtension(owner, engineInstance, this);
                    booted.push(extension.name);
                    this.bootedExtensions.pushObject(extension.name);
                    this.trigger('extension.booted', extension);
                    debug(`Booted : ${extension.name}`);
                } else {
                    stillPending.push({ extension, engineInstance });
                }
            });

            // If no progress was made, log an error in debug/development mode
            assert(`Some engines have unmet dependencies and cannot be booted:`, stillPending.length === 0 && pending.length === 0);

            pending.length = 0;
            pending.push(...stillPending);
        };

        // Run pre-boots if any
        await this.preboot();

        return loadInstalledExtensions(additionalCoreExtensions).then(async (extensions) => {
            for (let i = 0; i < extensions.length; i++) {
                const extension = extensions[i];
                await tryBootEngine(extension);
            }

            this.runBootCallbacks(owner, () => {
                this.enginesBooted = true;
            });
        });
    }

    /**
     * Run engine preboots from all indexed engines.
     *
     * @param {ApplicationInstance} owner
     * @memberof UniverseService
     */
    async preboot(owner) {
        const extensions = await loadExtensions();
        for (let i = 0; i < extensions.length; i++) {
            const extension = extensions[i];
            const instance = await this.loadEngine(extension.name);
            if (instance.base && typeof instance.base.preboot === 'function') {
                instance.base.preboot(owner, instance, this);
            }
        }
    }

    /**
     * Checks if an extension has been booted.
     *
     * @param {String} name
     * @return {Boolean}
     * @memberof UniverseService
     */
    didBootEngine(name) {
        return this.bootedExtensions.includes(name);
    }

    /**
     * Registers a callback function to be executed after the engine boot process completes.
     *
     * This method ensures that the `bootCallbacks` array is initialized. It then adds the provided
     * callback to this array. The callbacks registered will be invoked in sequence after the engine
     * has finished booting, using the `runBootCallbacks` method.
     *
     * @param {Function} callback - The function to execute after the engine boots.
     *   The callback should accept two arguments:
     *   - `{Object} universe` - The universe context or environment.
     *   - `{Object} appInstance` - The application instance.
     */
    afterBoot(callback) {
        if (!isArray(this.bootCallbacks)) {
            this.bootCallbacks = [];
        }

        this.bootCallbacks.pushObject(callback);
    }

    /**
     * Executes all registered engine boot callbacks in the order they were added.
     *
     * This method iterates over the `bootCallbacks` array and calls each callback function,
     * passing in the `universe` and `appInstance` parameters. After all callbacks have been
     * executed, it optionally calls a completion function `onComplete`.
     *
     * @param {Object} appInstance - The application instance to pass to each callback.
     * @param {Function} [onComplete] - Optional. A function to call after all boot callbacks have been executed.
     *   It does not receive any arguments.
     */
    runBootCallbacks(appInstance, onComplete = null) {
        for (let i = 0; i < this.bootCallbacks.length; i++) {
            const callback = this.bootCallbacks[i];
            if (typeof callback === 'function') {
                try {
                    callback(this, appInstance);
                } catch (error) {
                    debug(`Engine Boot Callback Error: ${error.message}`);
                }
            }
        }

        if (typeof onComplete === 'function') {
            onComplete();
        }
    }

    /**
     * Alias for intl service `t`
     *
     * @memberof UniverseService
     */
    t() {
        this.intl.t(...arguments);
    }
}

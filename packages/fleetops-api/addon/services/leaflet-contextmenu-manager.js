import Service from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { camelize } from '@ember/string';
import { later } from '@ember/runloop';
import getWithDefault from '@fleetbase/ember-core/utils/get-with-default';

/**
 * Service for managing context menus in Leaflet maps.
 *
 * This service provides functions to toggle context menu items, create context menus for specific
 * layers, and manage the context menu registry. It also includes utility functions for internal use.
 *
 * @class
 */
export default class LeafletContextmenuManagerService extends Service {
    /**
     * Registry for context menus associated with specific layers.
     *
     * @type {Object}
     */
    @tracked contextMenuRegistry = {};

    /**
     * Creates a context menu for a specific layer with the given items.
     *
     * @param {string} registryName - The name of the context menu registry.
     * @param {Object} layer - The Leaflet layer associated with the context menu.
     * @param {Array} items - An array of context menu items to add.
     * @returns {Object} The created context menu registry.
     */
    createContextMenu(registryName, layer, contextmenuItems = [], additionalContext = {}) {
        // create internal registry name
        const internalRegistryName = this.createInternalRegistryName(registryName);

        // get layer contextmenu api
        const contextmenuApi = layer.contextmenu;

        // bind contextmenu first
        if (typeof layer.bindContextMenu === 'function') {
            layer.bindContextMenu({
                contextmenu: true,
                contextmenuItems,
            });
        }

        // setup context menu
        if (contextmenuApi) {
            // remove all items first
            contextmenuApi.removeAllItems();

            // add items
            for (let i = 0; i < contextmenuItems.length; i++) {
                const item = contextmenuItems.objectAt(i);
                contextmenuApi.addItem(item);
            }

            // enable contextmenu
            contextmenuApi.enable();
        }

        // create contextmenu registry
        this.contextMenuRegistry[internalRegistryName] = {
            contextmenuItems,
            layer,
            contextmenuApi,
            ...additionalContext,
        };

        return this.contextMenuRegistry[internalRegistryName];
    }

    /**
     * Retrieves a context menu registry by its name.
     *
     * @param {string} registryName - The name of the context menu registry to retrieve.
     * @returns {Object|null} The context menu registry or null if not found.
     */
    getRegistry(registryName) {
        const internalRegistryName = this.createInternalRegistryName(registryName);

        if (this.contextMenuRegistry[internalRegistryName]) {
            return this.contextMenuRegistry[internalRegistryName];
        }

        return null;
    }

    /**
     * Creates an internal registry name by camelizing the provided registry name and appending "ConextmenuRegistry" to it.
     *
     * @method createInternalRegistryName
     * @public
     * @memberof LeafletContextmenuManagerService
     * @param {String} registryName - The name of the registry to be camelized and formatted.
     * @returns {String} The formatted internal registry name.
     */
    createInternalRegistryName(registryName) {
        return `${camelize(registryName.replace(/[^a-zA-Z0-9]/g, '-'))}ConextmenuRegistry`;
    }

    /**
     * Toggles a context menu item in the specified registry.
     *
     * @method createInternalRegistryName
     * @public
     * @param {string} registryName - The name of the context menu registry to toggle the item in.
     * @param {string|Function} selector - The selector or callback for the item to toggle.
     * @param {Object} options - Additional options for toggling the item (optional).
     */
    toggleContextMenuItem(registryName, selector, options = {}) {
        const registry = this.getRegistry(registryName);

        // get the context menu api
        const { contextmenuApi } = registry;

        // if just toggling text
        const toggle = getWithDefault(options, 'toggle', true);
        const onText = getWithDefault(options, 'onText');
        const offText = getWithDefault(options, 'offText');
        const callback = getWithDefault(options, 'callback');

        if (registry) {
            const index = registry.contextmenuItems.findIndex((item) => {
                if (typeof selector === 'string' && typeof item.text === 'string') {
                    return item.text.includes(selector);
                }

                if (typeof selector === 'function') {
                    return selector(item);
                }
            });

            if (index > 0) {
                const item = registry.contextmenuItems.objectAt(index);

                if (item) {
                    item.text = toggle ? onText : offText;
                }

                if (typeof callback === 'function') {
                    callback(toggle, item, registry);
                }

                // insert back into contextmenu
                if (contextmenuApi) {
                    contextmenuApi.removeItem(index);
                    contextmenuApi.insertItem(item, index);
                }
            }
        }
    }

    /**
     * Change the text of a context menu item within a specified registry.
     *
     * @param {string} registryName - The name of the context menu registry.
     * @param {string|function} selector - A string or function to select the menu item to change.
     * @param {string} newText - The new text to set for the menu item.
     * @param {Object} [options={}] - Additional options.
     * @param {function} [options.callback] - A callback function to execute.
     * @memberof LeafletContextmenuManagerService
     */
    changeMenuItemText(registryName, selector, newText, options = {}) {
        const registry = this.getRegistry(registryName);

        // get the context menu api
        const { contextmenuApi } = registry;

        // if just toggling text
        const callback = getWithDefault(options, 'callback');

        if (registry) {
            const index = registry.contextmenuItems.findIndex((item) => {
                if (typeof selector === 'string' && typeof item.text === 'string') {
                    return item.text.includes(selector);
                }

                if (typeof selector === 'function') {
                    return selector(item);
                }
            });

            if (index > 0) {
                const item = registry.contextmenuItems.objectAt(index);

                if (item) {
                    item.text = newText;
                }

                if (typeof callback === 'function') {
                    callback(item, registry);
                }

                // insert back into contextmenu
                if (contextmenuApi) {
                    contextmenuApi.removeItem(index);
                    contextmenuApi.insertItem(item, index);
                }
            }
        }
    }

    /**
     * Removes a specific item from the context menu associated with the given registry name.
     *
     * @method createInternalRegistryName
     * @public
     * @param {string} registryName - The name of the context menu registry to target.
     * @param {string|Function} selector - A string or function used to identify the item to remove.
     * @param {Object} options - Additional options for removing the item.
     * @param {Function} options.callback - A callback function to execute after item removal.
     */
    removeItemFromContextMenu(registryName, selector, options = {}) {
        const registry = this.getRegistry(registryName);

        // get the context menu api
        const { contextmenuApi } = registry;

        // if just toggling text
        const callback = getWithDefault(options, 'callback');

        if (registry) {
            const index = registry.contextmenuItems.findIndex((item) => {
                if (typeof selector === 'string' && typeof item.text === 'string') {
                    return item.text.includes(selector);
                }

                if (typeof selector === 'function') {
                    return selector(item);
                }
            });

            if (index > 0) {
                const item = registry.contextmenuItems.objectAt(index);

                if (typeof callback === 'function') {
                    callback(item, registry);
                }

                // remove from context menu
                if (contextmenuApi) {
                    contextmenuApi.removeItem(index);
                }
            }
        }
    }

    /**
     * Find a context menu registry by layer.
     *
     * @param {Layer} layer - The layer for which to find the registry.
     * @returns {Object|null} The context menu registry associated with the provided layer, or null if not found.
     */
    findRegistryByLayer(layer) {
        for (const registryName in this.contextMenuRegistry) {
            const registry = this.contextMenuRegistry[registryName];
            if (registry.layer === layer) {
                return registry;
            }
        }

        // If no matching registry is found, return null or handle the case accordingly.
        return null;
    }

    /**
     * Rebind the context menu for a layer and update the registry if it exists.
     *
     * @param {Layer} layer - The layer to rebind the context menu for.
     * @param {Array} contextmenuItems - An array of context menu items to bind.
     */
    rebindContextMenu(layer, contextmenuItems = []) {
        // make sure layer is instance of leaflet
        if (!(layer instanceof L.Layer)) {
            return;
        }

        const registry = this.findRegistryByLayer(layer);

        if (registry) {
            later(
                this,
                () => {
                    try {
                        if (typeof layer.unbindContextMenu === 'function') {
                            layer.unbindContextMenu().bindContextMenu({
                                contextmenu: true,
                                contextmenuItems,
                            });
                        } else {
                            // just bind
                            layer.bindContextMenu({
                                contextmenu: true,
                                contextmenuItems,
                            });
                        }
                    } catch (error) {
                        // silence
                    }

                    // if found registry update layer and contextmenu api
                    if (registry) {
                        registry.layer = layer;
                        registry.contextmenuApi = layer.contextmenu;
                    }
                },
                300
            );
        }
    }
}

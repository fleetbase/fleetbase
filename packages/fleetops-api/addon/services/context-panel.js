import Service, { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { camelize } from '@ember/string';
import getModelName from '@fleetbase/ember-core/utils/get-model-name';
import getWithDefault from '@fleetbase/ember-core/utils/get-with-default';
import isObject from '@fleetbase/ember-core/utils/is-object';

/**
 * Service for managing the state and interactions of the context panel.
 *
 * @class ContextPanelService
 * @memberof @fleetbase/fleetops
 * @extends Service
 */
export default class ContextPanelService extends Service {
    @service abilities;
    @service notifications;
    @service intl;

    /**
     * Registry mapping model names to their corresponding component details.
     * @type {Object}
     */
    registry = {
        driver: {
            viewing: {
                component: 'driver-panel',
                componentArguments: [{ isResizable: true }, { width: '500px' }],
            },
            editing: {
                component: 'driver-form-panel',
                componentArguments: [{ isResizable: true }, { width: '500px' }],
            },
        },
        vehicle: {
            viewing: {
                component: 'vehicle-panel',
                componentArguments: [{ isResizable: true }, { width: '500px' }],
            },
            editing: {
                component: 'vehicle-form-panel',
                componentArguments: [{ isResizable: true }, { width: '500px' }],
            },
        },
        fleet: {
            viewing: {
                component: 'fleet-panel',
                componentArguments: [{ isResizable: true }, { width: '500px' }],
            },
            editing: {
                component: 'fleet-form-panel',
                componentArguments: [{ isResizable: true }, { width: '500px' }],
            },
        },
        fuelReport: {
            viewing: {
                component: 'fuel-report-panel',
                componentArguments: [{ isResizable: true }, { width: '500px' }],
            },
            editing: {
                component: 'fuel-report-form-panel',
                componentArguments: [{ isResizable: true }, { width: '500px' }],
            },
        },
        vendor: {
            viewing: {
                component: 'vendor-panel',
                componentArguments: [{ isResizable: true }, { width: '500px' }],
            },
            editing: {
                component: 'vendor-form-panel',
                componentArguments: [{ isResizable: true }, { width: '500px' }],
            },
        },
        contact: {
            viewing: {
                component: 'contact-panel',
                componentArguments: [{ isResizable: true }, { width: '500px' }],
            },
            editing: {
                component: 'contact-form-panel',
                componentArguments: [{ isResizable: true }, { width: '500px' }],
            },
        },
        place: {
            viewing: {
                component: 'place-panel',
                componentArguments: [{ isResizable: true }, { width: '500px' }],
            },
            editing: {
                component: 'place-form-panel',
                componentArguments: [{ isResizable: true }, { width: '500px' }],
            },
        },
        issue: {
            viewing: {
                component: 'issue-panel',
                componentArguments: [{ isResizable: true }, { width: '500px' }],
            },
            editing: {
                component: 'issue-form-panel',
                componentArguments: [{ isResizable: true }, { width: '500px' }],
            },
        },
        order: {
            editingRoute: {
                component: 'edit-order-route-panel',
                componentArguments: [{ isResizable: true }, { width: '500px' }],
            },
        },
        customField: {
            editing: {
                component: 'custom-field-form-panel',
                componentArguments: [{ isResizable: true }, { width: '500px' }],
            },
        },
        activity: {
            editing: {
                component: 'activity-form-panel',
                componentArguments: [{ isResizable: true }, { width: '500px' }],
            },
        },
        customEntity: {
            editing: {
                component: 'custom-entity-form-panel',
                componentArguments: [{ isResizable: true }, { width: '500px' }],
            },
        },
        orderConfigManager: {
            component: 'order-config-manager-overlay',
            componentArguments: [{ isResizable: true }, { width: '500px' }],
        },
    };

    /**
     * The current context or model object.
     * @type {Object}
     * @tracked
     */
    @tracked currentContext;

    /**
     * The current registry configuration for the current context.
     * @type {Object}
     * @tracked
     */
    @tracked currentContextRegistry;

    /**
     * Arguments for the current context component.
     * @type {Object}
     * @tracked
     */
    @tracked currentContextComponentArguments = {};

    /**
     * Additional options for controlling the context.
     * @type {Object}
     * @tracked
     */
    @tracked contextOptions = {};

    /**
     * Focuses on a given model and intent.
     *
     * @method
     * @param {Object} model - The model to focus on.
     * @param {String} [intent='viewing'] - The type of intent ('viewing' or 'editing').
     * @action
     */
    @action focus(model, intent = 'viewing', options = {}) {
        // handle focus which is not based on a model resource
        // this is purely intent
        if (typeof model === 'string') {
            if (isObject(intent)) {
                options = intent;
            }

            const registry = this.registry[model];
            const dynamicArgs = getWithDefault(options, 'args', {});
            if (registry) {
                this.currentContext = null;
                this.currentContextRegistry = registry;
                this.currentContextComponentArguments = this.createDynamicArgsFromRegistry(registry, model, dynamicArgs);
                this.contextOptions = options;

                return this;
            }

            throw new Error(`Unable to focus selected context: ${model}`);
        }

        const modelName = getModelName(model);
        const intentModelName = this.getIntentModelName(model);
        const ability = this.getIntentAbility(intent, model);
        if (this.abilities.cannot(`fleet-ops ${ability} ${intentModelName}`)) {
            return this.notifications.warning(this.intl.t('common.unauthorized'));
        }

        const registry = this.getRegistryFromModelName(modelName);
        const dynamicArgs = getWithDefault(options, 'args', {});
        if (registry && registry[intent]) {
            this.currentContext = model;
            this.currentContextRegistry = registry[intent];
            this.currentContextComponentArguments = this.createDynamicArgsFromRegistry(registry[intent], model, dynamicArgs);
            this.contextOptions = options;

            return this;
        }
    }

    /**
     * Get the ability the user is attempting based on the model and intent.
     *
     * @param {String} intent
     * @param {Model} model
     * @return {String}
     * @memberof ContextPanelService
     */
    getIntentAbility(intent, model) {
        if (intent === 'viewing') {
            return 'view';
        }

        if (isObject(model) && model.isNew && intent === 'editing') {
            return 'create';
        }

        return 'update';
    }

    /**
     * Get the model name for the current intent.
     *
     * @param {Model} model
     * @return {String}
     * @memberof ContextPanelService
     */
    getIntentModelName(model) {
        let modelName = getModelName(model);
        if (modelName === 'activity') {
            return 'order-config';
        }

        return modelName;
    }

    /**
     * Get the correct registry from the modelName provided.
     *
     * @param {string} modelName
     * @return {object}
     * @memberof ContextPanelService
     */
    getRegistryFromModelName(modelName) {
        if (typeof modelName === 'string' && modelName.includes('-')) {
            modelName = camelize(modelName);
        }
        return this.registry[modelName];
    }

    /**
     * Clears the current context and associated details.
     *
     * @method
     * @action
     */
    @action clear() {
        this.currentContext = null;
        this.currentContextRegistry = null;
        this.currentContextComponentArguments = {};
        this.contextOptions = {};
    }

    /**
     * Changes the intent for the current context.
     *
     * @method
     * @param {String} intent - The new intent.
     * @action
     */
    @action changeIntent(intent) {
        if (this.currentContext) {
            return this.focus(this.currentContext, intent);
        }
    }

    /**
     * Sets an option key-value pair.
     *
     * @method
     * @param {String} key - The option key.
     * @param {*} value - The option value.
     */
    setOption(key, value) {
        this.contextOptions = {
            ...this.contextOptions,
            [key]: value,
        };
    }

    /**
     * Retrieves the value of an option key.
     *
     * @method
     * @param {String} key - The option key.
     * @param {*} [defaultValue=null] - The default value to return if the key is not found.
     * @returns {*}
     */
    getOption(key, defaultValue = null) {
        const value = this.contextOptions[key];

        if (value === undefined) {
            return defaultValue;
        }

        return value;
    }

    /**
     * Generates dynamic arguments for a given registry and model.
     *
     * @method
     * @param {Object} registry - The registry details for a given model.
     * @param {Object} model - The model object.
     * @returns {Object} The dynamic arguments.
     */
    createDynamicArgsFromRegistry(registry, model, additionalArgs = {}) {
        // Generate dynamic arguments object
        const dynamicArgs = {
            [camelize(getModelName(model))]: model,
        };
        const componentArguments = registry.componentArguments || [];

        componentArguments.forEach((arg, index) => {
            if (typeof arg === 'string') {
                dynamicArgs[arg] = model[arg]; // Map string arguments to model properties
            } else if (typeof arg === 'object' && arg !== null) {
                Object.assign(dynamicArgs, arg);
            } else {
                // Handle other types of arguments as needed
                dynamicArgs[`arg${index}`] = arg;
            }
        });

        // Merge additional args
        Object.assign(dynamicArgs, additionalArgs);

        return dynamicArgs;
    }
}

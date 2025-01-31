import Component from '@glimmer/component';
import EmberObject from '@ember/object';
import Evented from '@ember/object/evented';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { isArray } from '@ember/array';
import { dasherize } from '@ember/string';
import { task } from 'ember-concurrency-decorators';
import isModel from '@fleetbase/ember-core/utils/is-model';
import getModelName from '@fleetbase/ember-core/utils/get-model-name';
import contextComponentCallback from '@fleetbase/ember-core/utils/context-component-callback';
import applyContextComponentArguments from '@fleetbase/ember-core/utils/apply-context-component-arguments';
import OrderConfigManagerDetailsComponent from './order-config-manager/details';
import OrderConfigManagerCustomFieldsComponent from './order-config-manager/custom-fields';
import OrderConfigManagerActivityFlowComponent from './order-config-manager/activity-flow';
import OrderConfigManagerEntitiesComponent from './order-config-manager/entities';
import findActiveTab from '../utils/find-active-tab';

const configManagerContext = EmberObject.extend(Evented);
export default class OrderConfigManagerComponent extends Component {
    @service universe;
    @service notifications;
    @service modalsManager;
    @service store;
    @service intl;
    @tracked configs = [];
    @tracked currentConfig;
    @tracked tab;
    @tracked configManagerContext;
    @tracked context;
    @tracked contextModel;
    @tracked ready = false;

    /**
     * Returns the array of tabs available for the panel.
     *
     * @type {Array}
     */
    get tabs() {
        const registeredTabs = this.universe.getMenuItemsFromRegistry('fleet-ops:component:order-config-manager');
        const defaultTabs = [
            this.universe._createMenuItem('Details', null, { icon: 'circle-info', component: OrderConfigManagerDetailsComponent }),
            this.universe._createMenuItem('Custom Fields', null, { icon: 'rectangle-list', component: OrderConfigManagerCustomFieldsComponent }),
            this.universe._createMenuItem('Activity Flow', null, { icon: 'diagram-project', component: OrderConfigManagerActivityFlowComponent }),
            this.universe._createMenuItem('Entities', null, { icon: 'boxes-packing', component: OrderConfigManagerEntitiesComponent }),
        ];

        if (isArray(registeredTabs)) {
            return [...defaultTabs, ...registeredTabs];
        }

        return defaultTabs;
    }

    /**
     * Constructs the component and applies initial state.
     */
    constructor(owner, { tab, context, contextModel }) {
        super(...arguments);
        applyContextComponentArguments(this);

        this.context = context;
        this.contextModel = contextModel;
        this.configManagerContext = configManagerContext.create();
        this.tab = findActiveTab(this.tabs, tab);
        this.loadOrderConfigs.perform();
    }

    /**
     * Loads all available order configs asynchronously.
     *
     * @returns {void}
     * @memberof OrderConfigManagerComponent
     * @method loadOrderConfigs
     * @instance
     * @task
     * @generator
     */
    @task *loadOrderConfigs(options = {}) {
        this.configs = yield this.store.findAll('order-config').then(Array.from);

        let currentConfig;
        let initialOrderConfig = this.args.orderConfig;
        if (isArray(this.configs) && this.configs.length > 0) {
            if (initialOrderConfig) {
                currentConfig = this.configs.find((config) => {
                    if (isModel(initialOrderConfig)) {
                        return config.id === initialOrderConfig.id;
                    }

                    if (typeof initialOrderConfig === 'string') {
                        return config.id === initialOrderConfig;
                    }
                });
            }

            if (!currentConfig) {
                currentConfig = this.configs[0];
            }

            this.selectConfig(currentConfig);
        }

        if (typeof options.onAfter === 'function') {
            options.onAfter(this.configs, currentConfig);
        }

        this.ready = true;
    }

    /**
     * Handle anonymous context change.
     *
     * @memberof OrderConfigManagerComponent
     */
    @action onContextChanged(context) {
        const isValidContext = context && isModel(context);
        if (context === null || !isValidContext) {
            this.context = undefined;
            this.contextModel = undefined;
            contextComponentCallback(this, 'onContextChanged', this.context, this.contextModel);
            return;
        }

        this.context = context.get('id');
        this.contextModel = getModelName(context);
        contextComponentCallback(this, 'onContextChanged', this.context, this.contextModel);
    }

    /**
     * Creates a new order configuration and displays a modal for further interaction.
     *
     * This action initializes a new 'order-config' record with default values and
     * displays a modal to the user for creating a new order configuration. The modal
     * is configured with various properties including titles, button icons, and a callback
     * for the confirm action. The confirm action includes validation and saving of the
     * new order configuration, along with success and warning notifications.
     */
    @action createNewOrderConfig() {
        const orderConfig = this.store.createRecord('order-config', {
            tags: [],
        });

        this.modalsManager.show('modals/new-order-config', {
            title: this.intl.t('fleet-ops.component.order-config-manager.create-new-title'),
            acceptButtonIcon: 'check',
            acceptButtonIconPrefix: 'fas',
            declineButtonIcon: 'times',
            declineButtonIconPrefix: 'fas',
            orderConfig,
            addTag: (tag) => {
                orderConfig.addTag(tag);
            },
            removeTag: (index) => {
                orderConfig.removeTag(index);
            },
            confirm: (modal) => {
                if (!orderConfig.name) {
                    return this.notifications.warning(this.intl.t('fleet-ops.component.order-config-manager.create-warning-message'));
                }

                modal.startLoading();
                orderConfig.set('key', dasherize(orderConfig.name));
                orderConfig
                    .save()
                    .then((newOrderConfig) => {
                        this.notifications.success(this.intl.t('fleet-ops.component.order-config-manager.create-success-message'));
                        this.loadOrderConfigs.perform({
                            onAfter: () => {
                                this.selectConfig(newOrderConfig);
                            },
                        });
                        modal.done();
                    })
                    .catch((error) => {
                        modal.stopLoading();
                        this.notifications.serverError(error);
                    });
            },
            decline: (modal) => {
                orderConfig.destroyRecord();
                modal.done();
            },
        });
    }

    /**
     * Selects a specific order configuration.
     *
     * This action sets the 'currentConfig' property of the component to the
     * specified configuration object.
     *
     * @param {Object} config - The order configuration object to be selected.
     */
    @action selectConfig(config) {
        this.currentConfig = config;
        this.configManagerContext.set('currentConfig', config);
        this.configManagerContext.trigger('onConfigChanged', config);
        contextComponentCallback(this, 'onConfigChanged', ...arguments);
    }

    /**
     * Handles the deletion process of an order configuration.
     *
     * This action is called when an order configuration is in the process of being deleted.
     * It deselects the current configuration and performs additional operations defined
     * in 'contextComponentCallback'.
     */
    @action onConfigDeleting() {
        this.selectConfig(null);
        this.configManagerContext.trigger('onConfigDeleting');
        contextComponentCallback(this, 'onConfigDeleting', ...arguments);
    }

    /**
     * Executes actions after an order configuration has been deleted.
     *
     * Once a configuration is deleted, this action reloads the order configurations and
     * executes additional operations defined in 'contextComponentCallback'.
     */
    @action onConfigDeleted() {
        this.loadOrderConfigs.perform();
        this.configManagerContext.trigger('onConfigDeleted');
        contextComponentCallback(this, 'onConfigDeleted', ...arguments);
    }

    /**
     * Performs operations after an order configuration has been updated.
     *
     * This action is triggered when an order configuration update occurs.
     * It primarily executes additional operations defined in 'contextComponentCallback'.
     */
    @action onConfigUpdated() {
        this.configManagerContext.trigger('onConfigUpdated');
        contextComponentCallback(this, 'onConfigUpdated', ...arguments);
    }

    /**
     * Sets the overlay context.
     *
     * @action
     * @param {OverlayContextObject} overlayContext
     */
    @action setOverlayContext(overlayContext) {
        this.context = overlayContext;
        this.configManagerContext.trigger('onLoad');
        contextComponentCallback(this, 'onLoad', ...arguments);
    }

    /**
     * Handles changing the active tab.
     *
     * @method
     * @param {String} tab - The new tab to switch to.
     * @action
     */
    @action onTabChanged(tab) {
        this.tab = findActiveTab(this.tabs, tab);
        this.configManagerContext.trigger('onTabChanged');
        contextComponentCallback(this, 'onTabChanged', tab);
    }

    /**
     * Handles edit action for the place.
     *
     * @method
     * @action
     */
    @action onEdit() {
        const isActionOverrided = contextComponentCallback(this, 'onEdit');

        if (!isActionOverrided) {
            this.contextPanel.clear();
        }
    }

    /**
     * Handles the cancel action.
     *
     * @method
     * @action
     * @returns {Boolean} Indicates whether the cancel action was overridden.
     */
    @action onPressCancel() {
        return contextComponentCallback(this, 'onPressCancel');
    }
}

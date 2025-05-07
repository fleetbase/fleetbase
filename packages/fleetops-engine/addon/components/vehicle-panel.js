import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import { isArray } from '@ember/array';
import VehiclePanelDetailComponent from './vehicle-panel/details';
import contextComponentCallback from '@fleetbase/ember-core/utils/context-component-callback';
import applyContextComponentArguments from '@fleetbase/ember-core/utils/apply-context-component-arguments';
import findActiveTab from '../utils/find-active-tab';

/**
 * Represents the vehicle panel component, handling vehicle information display and editing.
 *
 * @class VehiclePanelComponent
 * @extends Component
 */
export default class VehiclePanelComponent extends Component {
    /**
     * Service for fetching data.
     *
     * @type {Service}
     */
    @service fetch;
    /**
     * Service for managing translations.
     */
    @service intl;

    /**
     * Service for managing modals.
     *
     * @type {Service}
     */
    @service modalsManager;

    /**
     * Universe service for managing global data and settings.
     *
     * @type {Service}
     */
    @service universe;

    /**
     * Ember data store service.
     *
     * @type {Service}
     */
    @service store;

    /**
     * Service for managing routing within the host app.
     *
     * @type {Service}
     */
    @service hostRouter;

    /**
     * Service for managing the context panel.
     *
     * @type {Service}
     */
    @service contextPanel;

    /**
     * The current active tab.
     *
     * @type {Object}
     * @tracked
     */
    @tracked tab;

    /**
     * The vehicle being displayed or edited.
     *
     * @type {VehicleModel}
     * @tracked
     */
    @tracked vehicle;

    /**
     * Returns the array of tabs available for the panel.
     *
     * @type {Array}
     */
    get tabs() {
        const registeredTabs = this.universe.getMenuItemsFromRegistry('fleet-ops:component:vehicle-panel');
        const defaultTabs = [
            this.universe._createMenuItem(
              this.intl.t('fleet-ops.common.details'), // using a translation key
              null,
              {
                id: 'details',
                icon: 'circle-info',
                component: VehiclePanelDetailComponent
              }
            )
          ];

        if (isArray(registeredTabs)) {
            return [...defaultTabs, ...registeredTabs];
        }

        return defaultTabs;
    }

    /**
     * Initializes the vehicle panel component.
     */
    constructor() {
        super(...arguments);
        this.vehicle = this.args.vehicle;
        this.tab = findActiveTab(this.tabs, this.args.tab);
        applyContextComponentArguments(this);
    }

    /**
     * Sets the overlay context.
     *
     * @action
     * @param {OverlayContextObject} overlayContext
     */
    @action setOverlayContext(overlayContext) {
        this.context = overlayContext;
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
        contextComponentCallback(this, 'onTabChanged', tab);
    }

    /**
     * Handles edit action for the vehicle.
     *
     * @method
     * @action
     */
    @action onEdit() {
        const isActionOverrided = contextComponentCallback(this, 'onEdit', this.vehicle);

        if (!isActionOverrided) {
            this.contextPanel.focus(this.vehicle, 'editing', {
                onAfterSave: () => {
                    this.contextPanel.clear();
                },
            });
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
        return contextComponentCallback(this, 'onPressCancel', this.vehicle);
    }
}

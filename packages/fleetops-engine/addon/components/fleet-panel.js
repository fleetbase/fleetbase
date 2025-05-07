import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import { isArray } from '@ember/array';
import FleetPanelDetailComponent from './fleet-panel/details';
import FleetPanelDriverListingComponent from './fleet-panel/driver-listing';
import FleetPanelVehicleListingComponent from './fleet-panel/vehicle-listing';
import contextComponentCallback from '@fleetbase/ember-core/utils/context-component-callback';
import applyContextComponentArguments from '@fleetbase/ember-core/utils/apply-context-component-arguments';
import findActiveTab from '../utils/find-active-tab';

export default class FleetPanelComponent extends Component {
    @service fetch;
    @service modalsManager;
    @service universe;
    @service store;
    @service hostRouter;
    @service contextPanel;
    @service intl;

    /**
     * The current active tab.
     *
     * @type {Object}
     * @tracked
     */
    @tracked tab;

    /**
     * The fleet being displayed or edited.
     *
     * @type {FleetModel}
     * @tracked
     */
    @tracked fleet;

    /**
     * Returns the array of tabs available for the panel.
     *
     * @type {Array}
     */
    get tabs() {
        const registeredTabs = this.universe.getMenuItemsFromRegistry('fleet-ops:component:fleet-panel');
        const defaultTabs = [
            this.universe._createMenuItem(this.intl.t('fleet-ops.common.details'), null, {
                id: 'details',
                icon: 'circle-info',
                component: FleetPanelDetailComponent,
            }),
            this.universe._createMenuItem(this.intl.t('fleet-ops.component.layout.fleet-ops-sidebar.vehicles'), null, {
                id: 'vehicles',
                icon: 'car',
                component: FleetPanelVehicleListingComponent,
                componentParams: { wrapperClass: 'px-4 pt-6', selectable: true },
            }),
            this.universe._createMenuItem(this.intl.t('fleet-ops.component.layout.fleet-ops-sidebar.drivers'), null, {
                id: 'drivers',
                icon: 'id-card',
                component: FleetPanelDriverListingComponent,
                componentParams: { wrapperClass: 'px-4 pt-6', selectable: true },
            }),
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
        this.fleet = this.args.fleet;
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
     * Handles edit action for the fleet.
     *
     * @method
     * @action
     */
    @action onEdit() {
        const isActionOverrided = contextComponentCallback(this, 'onEdit', this.fleet);

        if (!isActionOverrided) {
            this.contextPanel.focus(this.fleet, 'editing', {
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
        return contextComponentCallback(this, 'onPressCancel', this.fleet);
    }
}

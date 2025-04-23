import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import { isArray } from '@ember/array';
import contextComponentCallback from '@fleetbase/ember-core/utils/context-component-callback';
import applyContextComponentArguments from '@fleetbase/ember-core/utils/apply-context-component-arguments';
import LiveMapDrawerVehicleListingComponent from './live-map-drawer/vehicle-listing';
import LiveMapDrawerDriverListingComponent from './live-map-drawer/driver-listing';
import LiveMapDrawerPlaceListingComponent from './live-map-drawer/place-listing';
import findActiveTab from '../utils/find-active-tab';

export default class LiveMapDrawerComponent extends Component {
    @service universe;
    @service intl;

    /**
     * The current active tab.
     *
     * @type {Object}
     * @tracked
     */
    @tracked tab;

    /**
     * The drawer component context api.
     *
     * @type {Object}
     * @tracked
     */
    @tracked drawer;

    /**
     * Returns the array of tabs available for the drawer.
     *
     * @type {Array}
     */
    get tabs() {
        const registeredTabs = this.universe.getMenuItemsFromRegistry('fleet-ops:component:live-map-drawer');
        const defaultTabs = [
            this.universe._createMenuItem(this.intl.t('fleet-ops.component.layout.fleet-ops-sidebar.vehicles'), null, { icon: 'car', component: LiveMapDrawerVehicleListingComponent }),
            this.universe._createMenuItem(this.intl.t('fleet-ops.component.layout.fleet-ops-sidebar.drivers'), null, { icon: 'id-card', component: LiveMapDrawerDriverListingComponent }),
            this.universe._createMenuItem(this.intl.t('fleet-ops.component.layout.fleet-ops-sidebar.places'), null, { icon: 'building', component: LiveMapDrawerPlaceListingComponent }),
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
        this.tab = findActiveTab(this.tabs, this.args.tab);
        applyContextComponentArguments(this);
    }

    /**
     * Sets the drawer component context api.
     *
     * @param {Object} drawerApi
     * @memberof LiveMapDrawerComponent
     */
    @action setDrawerContext(drawerApi) {
        this.drawer = drawerApi;

        if (typeof this.args.onDrawerReady === 'function') {
            this.args.onDrawerReady(...arguments);
        }
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
}

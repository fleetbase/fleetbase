import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import FleetListingComponent from './fleet-ops-sidebar/fleet-listing';
import DriverListingComponent from './fleet-ops-sidebar/driver-listing';

export default class LayoutFleetOpsSidebarComponent extends Component {
    @service universe;
    @service contextPanel;
    @service store;
    @service intl;
    @service abilities;
    @tracked routePrefix = 'console.fleet-ops.';
    @tracked menuPanels = [];
    @tracked universeMenuItems = [];
    @tracked universeSettingsMenuItems = [];
    @tracked universeMenuPanels = [];

    constructor() {
        super(...arguments);
        this.createMenuItemsFromUniverseRegistry();
        this.createMenuPanels();
    }

    createMenuItemsFromUniverseRegistry() {
        const registeredMenuItems = this.universe.getMenuItemsFromRegistry('engine:fleet-ops');
        this.universeMenuPanels = this.universe.getMenuPanelsFromRegistry('engine:fleet-ops');
        this.universeMenuItems = registeredMenuItems.filter((menuItem) => menuItem.section === undefined);
        this.universeSettingsMenuItems = registeredMenuItems.filter((menuItem) => menuItem.section === 'settings');
    }

    createMenuPanels() {
        const operationsItems = [
            {
                intl: 'fleet-ops.component.layout.fleet-ops-sidebar.dashboard',
                title: this.intl.t('fleet-ops.component.layout.fleet-ops-sidebar.dashboard'),
                icon: 'home',
                route: 'operations.orders',
                permission: 'fleet-ops list order',
                visible: this.abilities.can('fleet-ops see order'),
            },
            {
                intl: 'fleet-ops.component.layout.fleet-ops-sidebar.service-rates',
                title: this.intl.t('fleet-ops.component.layout.fleet-ops-sidebar.service-rates'),
                icon: 'tag',
                route: 'operations.service-rates',
                permission: 'fleet-ops list service-rate',
                visible: this.abilities.can('fleet-ops see service-rate'),
            },
            {
                intl: 'fleet-ops.component.layout.fleet-ops-sidebar.scheduler',
                title: this.intl.t('fleet-ops.component.layout.fleet-ops-sidebar.scheduler'),
                icon: 'calendar-check',
                route: 'operations.scheduler',
                permission: 'fleet-ops list order',
                visible: this.abilities.can('fleet-ops see order'),
            },
            {
                intl: 'fleet-ops.component.layout.fleet-ops-sidebar.order-config',
                title: this.intl.t('fleet-ops.component.layout.fleet-ops-sidebar.order-config'),
                icon: 'cog',
                route: 'operations.order-config',
                permission: 'fleet-ops list order-config',
                visible: this.abilities.can('fleet-ops see order-config'),
            },
        ];

        const resourcesItems = [
            {
                intl: 'fleet-ops.component.layout.fleet-ops-sidebar.drivers',
                title: this.intl.t('fleet-ops.component.layout.fleet-ops-sidebar.drivers'),
                icon: 'id-card',
                route: 'management.drivers',
                renderComponentInPlace: true,
                component: DriverListingComponent,
                permission: 'fleet-ops list driver',
                visible: this.abilities.can('fleet-ops see driver'),
            },
            {
                intl: 'fleet-ops.component.layout.fleet-ops-sidebar.vehicles',
                title: this.intl.t('fleet-ops.component.layout.fleet-ops-sidebar.vehicles'),
                icon: 'truck-moving',
                route: 'management.vehicles',
                permission: 'fleet-ops list vehicle',
                visible: this.abilities.can('fleet-ops see vehicle'),
            },
            {
                intl: 'fleet-ops.component.layout.fleet-ops-sidebar.fleets',
                title: this.intl.t('fleet-ops.component.layout.fleet-ops-sidebar.fleets'),
                icon: 'truck-ramp-box',
                route: 'management.fleets',
                renderComponentInPlace: true,
                component: FleetListingComponent,
                permission: 'fleet-ops list fleet',
                visible: this.abilities.can('fleet-ops see fleet'),
            },
            {
                intl: 'fleet-ops.component.layout.fleet-ops-sidebar.vendors',
                title: this.intl.t('fleet-ops.component.layout.fleet-ops-sidebar.vendors'),
                icon: 'shop',
                route: 'management.vendors',
                permission: 'fleet-ops list vendor',
                visible: this.abilities.can('fleet-ops see vendor'),
            },
            {
                intl: 'fleet-ops.component.layout.fleet-ops-sidebar.contacts',
                title: this.intl.t('fleet-ops.component.layout.fleet-ops-sidebar.contacts'),
                icon: 'address-book',
                route: 'management.contacts',
                permission: 'fleet-ops list contact',
                visible: this.abilities.can('fleet-ops see contact'),
            },
            {
                intl: 'fleet-ops.component.layout.fleet-ops-sidebar.places',
                title: this.intl.t('fleet-ops.component.layout.fleet-ops-sidebar.places'),
                icon: 'magnifying-glass-location',
                route: 'management.places',
                permission: 'fleet-ops list place',
                visible: this.abilities.can('fleet-ops see place'),
            },
            {
                intl: 'fleet-ops.component.layout.fleet-ops-sidebar.fuel-reports',
                title: this.intl.t('fleet-ops.component.layout.fleet-ops-sidebar.fuel-reports'),
                icon: 'gas-pump',
                route: 'management.fuel-reports',
                permission: 'fleet-ops list fuel-report',
                visible: this.abilities.can('fleet-ops see fuel-report'),
            },
            {
                intl: 'fleet-ops.component.layout.fleet-ops-sidebar.parking',
                title: this.intl.t('fleet-ops.component.layout.fleet-ops-sidebar.parking'),
                icon: 'parking',
                route: 'management.parking',
                permission: 'fleet-ops list fuel-report',
                visible: this.abilities.can('fleet-ops see fuel-report'),
            },
            {
                intl: 'fleet-ops.component.layout.fleet-ops-sidebar.issues',
                title: this.intl.t('fleet-ops.component.layout.fleet-ops-sidebar.issues'),
                icon: 'clipboard-list',
                route: 'management.issues',
                permission: 'fleet-ops list issue',
                visible: this.abilities.can('fleet-ops see issue'),
            },
        ];

        const settingsItems = [];

        const createPanel = (intl, routePrefix, items = []) => ({
            intl,
            title: this.intl.t(intl),
            routePrefix,
            open: true,
            items,
        });

        this.menuPanels = this.removeEmptyMenuPanels([
            createPanel('fleet-ops.component.layout.fleet-ops-sidebar.operations', 'operations', operationsItems),
            createPanel('fleet-ops.component.layout.fleet-ops-sidebar.resources', 'management', resourcesItems),
            createPanel('fleet-ops.component.layout.fleet-ops-sidebar.settings', 'settings', settingsItems),
        ]);
    }

    /**
     * Action handler for creating an order.
     */
    @action onClickCreateOrder() {
        const { onClickCreateOrder } = this.args;

        if (typeof onClickCreateOrder === 'function') {
            onClickCreateOrder();
        }
    }

    /**
     * Action handler for opening settings.
     */
    @action onClickSettings() {
        const { onClickSettings } = this.args;

        if (typeof onClickSettings === 'function') {
            onClickSettings();
        }
    }

    /**
     * Filters menuPanels, leaving only menuPanels with visible items
     *
     * @param {Array} [menuPanels=[]]
     * @return {Array}
     * @memberof LayoutFleetOpsSidebarComponent
     */
    removeEmptyMenuPanels(menuPanels = []) {
        return menuPanels.filter((menuPanel) => {
            const visibleItems = menuPanel.items.filter((item) => item.visible);
            return visibleItems.length > 0;
        });
    }
}

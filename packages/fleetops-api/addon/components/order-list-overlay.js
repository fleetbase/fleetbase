import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { isArray } from '@ember/array';
import { isEmpty } from '@ember/utils';
import { task } from 'ember-concurrency';
import contextComponentCallback from '@fleetbase/ember-core/utils/context-component-callback';

export default class OrderListOverlayComponent extends Component {
    @service store;
    @service fetch;
    @service appCache;
    @service hostRouter;
    @service notifications;
    @service abilities;
    @service urlSearchParams;
    @service contextPanel;
    @tracked fleets = [];
    @tracked selectedOrders = [];
    @tracked overlayContext;
    @tracked query = null;
    @tracked isOpen = false;
    @tracked loaded = false;
    @tracked orderGroups = {
        activeOrders: [],
        unassignedOrders: [],
    };

    constructor(owner, { isOpen = false }) {
        super(...arguments);
        this.isOpen = isOpen;
    }

    @action onLoad(overlayContext) {
        this.overlayContext = overlayContext;

        if (this.urlSearchParams.get('orderPanelOpen')) {
            this.overlayContext.open();
        }

        if (typeof this.args.onLoad === 'function') {
            this.args.onLoad(...arguments);
        }
    }

    @action onOpen() {
        if (!this.loaded) {
            this.load.perform();
        }

        this.urlSearchParams.addParamToCurrentUrl('orderPanelOpen', 1);
    }

    @action onClose() {
        this.urlSearchParams.removeParamFromCurrentUrl('orderPanelOpen');
    }

    @action selectOrder(order) {
        if (this.selectedOrders.includes(order)) {
            this.selectedOrders.removeObject(order);
        } else {
            this.selectedOrders.pushObject(order);
        }
    }

    @action viewOrder(order) {
        return this.hostRouter.transitionTo('console.fleet-ops.operations.orders.index.view', order);
    }

    @action onAction(actionName, ...params) {
        contextComponentCallback(this, actionName, ...params, this);
    }

    @task *load() {
        yield this.loadFleets.perform();
        yield this.loadUnassignedOrders.perform();
        yield this.loadActiveOrders.perform();
        this.loaded = true;
    }

    @task *loadFleets() {
        if (this.abilities.cannot('fleet-ops list fleet')) {
            return;
        }

        // Get orders which are already loaded to exclude from reloading
        const activeLoadedOrders = this.getLoadedOrders();

        try {
            let fleets = yield this.store.query('fleet', {
                excludeDriverJobs: activeLoadedOrders.map((_) => _.public_id),
                with: ['serviceArea', 'drivers.jobs', 'drivers.currentJob'],
                without: ['drivers.fleets'],
            });

            // reset loaded jobs to drivers
            if (isArray(fleets)) {
                fleets = fleets.map((fleet) => {
                    fleet.drivers = fleet.drivers.map((driver) => {
                        driver.set('orderPanelActiveJobs', [...driver.activeJobs, ...this.getLoadedActiveOrderForDriver(driver)]);
                        return driver;
                    });

                    return fleet;
                });

                this.fleets = fleets;
                this.appCache.setEmberData('fleets', fleets);
            }
        } catch (error) {
            this.notifications.serverError(error);
        }
    }

    @task *loadUnassignedOrders() {
        if (this.abilities.cannot('fleet-ops list order')) {
            return;
        }

        // Get orders which are already loaded to exclude from reloading
        const activeLoadedOrders = this.getLoadedOrders();

        try {
            const unassignedOrders = yield this.fetch.get(
                'fleet-ops/live/orders',
                {
                    unassigned: 1,
                    exclude: activeLoadedOrders.map((_) => _.public_id),
                },
                {
                    normalizeToEmberData: true,
                    normalizeModelType: 'order',
                    expirationInterval: 5,
                    expirationIntervalUnit: 'minute',
                }
            );
            this.orderGroups = {
                ...this.orderGroups,
                unassignedOrders: [...unassignedOrders, ...this.getLoadedUnassignedOrder()],
            };
        } catch (error) {
            this.notifications.serverError(error);
        }
    }

    @task *loadActiveOrders() {
        if (this.abilities.cannot('fleet-ops list order')) {
            return;
        }

        // Get orders which are already loaded to exclude from reloading
        const activeLoadedOrders = this.getLoadedOrders();

        // Load live orders
        try {
            const serverActiveOrders = yield this.fetch.get(
                'fleet-ops/live/orders',
                {
                    active: 1,
                    with_tracker_data: 1,
                    exclude: activeLoadedOrders.map((_) => _.public_id),
                },
                {
                    normalizeToEmberData: true,
                    normalizeModelType: 'order',
                    expirationInterval: 5,
                    expirationIntervalUnit: 'minute',
                }
            );
            const activeOrders = [...serverActiveOrders, ...this.getLoadedActiveOrder()];

            for (let order of activeOrders) {
                if (!order.get('tracker_data')) {
                    order.loadTrackerData();
                }
            }

            this.orderGroups = {
                ...this.orderGroups,
                activeOrders,
            };
        } catch (error) {
            this.notifications.serverError(error);
        }
    }

    getLoadedOrders(filter = null) {
        filter =
            typeof filter === 'function'
                ? filter
                : function () {
                      return true;
                  };

        const loadedOrders = this.store.peekAll('order');
        return loadedOrders.filter(filter);
    }

    getLoadedUnassignedOrder() {
        return this.getLoadedOrders((order) => {
            return isEmpty(order.driver_assigned_uuid);
        });
    }

    getLoadedActiveOrder() {
        return this.getLoadedOrders((order) => {
            return !isEmpty(order.driver_assigned) && !['created', 'completed', 'canceled', 'expired'].includes(order.status);
        });
    }

    getLoadedActiveOrderForDriver(driver) {
        return this.getLoadedOrders((order) => {
            return !isEmpty(order.driver_assigned) && order.driver_assigned.id === driver.id && !['created', 'completed', 'canceled', 'expired'].includes(order.status);
        });
    }
}

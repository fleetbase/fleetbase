import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { isBlank } from '@ember/utils';
import { action, set } from '@ember/object';
import { timeout } from 'ember-concurrency';
import { task } from 'ember-concurrency-decorators';
import contextComponentCallback from '@fleetbase/ember-core/utils/context-component-callback';

export default class FleetPanelDriverListingComponent extends Component {
    @service store;
    @service fetch;
    @service intl;
    @service universe;
    @service notifications;

    /**
     * The selected drivers.
     *
     * @var {Array}
     * @memberof FleetPanelDriverListingComponent
     */
    @tracked selected = [];

    /**
     * Determines if list of drivers should be selectable.
     *
     * @var {Boolean}
     * @memberof FleetPanelDriverListingComponent
     */
    @tracked selectable = false;

    /**
     * The fleet managing drivers for.
     *
     * @var {FleetModel}
     * @memberof FleetPanelDriverListingComponent
     */
    @tracked fleet;

    /**
     * Creates an instance of FleetPanelDriverListingComponent.
     * @memberof FleetPanelDriverListingComponent
     */
    constructor() {
        super(...arguments);
        const { options = {} } = this.args;

        this.fleet = this.args.fleet;
        this.selectable = this.args.selectable === true || options.selectable === true;
        this.search.perform({ limit: -1 });
    }

    /**
     * Fetches fleet drivers based on the given parameters.
     * @param {Object} params - Parameters to filter the drivers.
     * @returns {Promise} Promise object representing the fetched drivers.
     * @memberof FleetPanelDriverListringComponent
     */
    fetchFleetDrivers(params = {}) {
        return this.store.query('driver', { fleet: this.fleet.id, ...params, limit: 500 }).then((drivers) => {
            set(this, 'drivers', drivers.toArray());
            contextComponentCallback(this, 'onLoaded', drivers);

            return drivers;
        });
    }

    /**
     * Searches for fleet drivers based on the given parameters.
     * @task
     * @param {Object} params - Search parameters.
     * @memberof FleetPanelDriverListringComponent
     */
    @task({ restartable: true }) *search(params = {}) {
        if (!isBlank(params.value)) {
            yield timeout(300);
        }

        yield this.fetchFleetDrivers(params);
    }

    /**
     * Handles input events to initiate search.
     * @action
     * @param {Object} event - The input event.
     * @memberof FleetPanelDriverListringComponent
     */
    @action onInput({ target: { value } }) {
        this.search.perform({ query: value });
    }

    /**
     * Assigns a driver to the fleet.
     * @action
     * @param {DriverModel} driver - The driver to be added.
     * @memberof FleetPanelDriverListringComponent
     */
    @action async onAddDriver(driver) {
        try {
            await this.fetch.post('fleets/assign-driver', { driver: driver.id, fleet: this.fleet.id });
            this.drivers.pushObject(driver);
            this.universe.trigger('fleet-ops.fleet.driver_assigned', this.fleet, driver);
        } catch (error) {
            this.notifications.serverError(error);
        }
    }

    /**
     * Removes a driver from the fleet.
     * @action
     * @param {DriverModel} driver - The driver to be removed.
     * @memberof FleetPanelDriverListringComponent
     */
    @action async onRemoveDriver(driver) {
        try {
            await this.fetch.post('fleets/remove-driver', { driver: driver.id, fleet: this.fleet.id });
            this.drivers.removeObject(driver);
            this.universe.trigger('fleet-ops.fleet.driver_unassigned', this.fleet, driver);
        } catch (error) {
            this.notifications.serverError(error);
        }
    }

    /**
     * Selects or deselects a driver.
     * @action
     * @param {DriverModel} driver - The driver to be selected or deselected.
     * @memberof FleetPanelDriverListringComponent
     */
    @action onSelect(driver) {
        if (this.selected.includes(driver)) {
            this.selected.removeObject(driver);
        } else {
            this.selected.pushObject(driver);
        }

        contextComponentCallback(this, 'onSelect', ...arguments);
    }
}

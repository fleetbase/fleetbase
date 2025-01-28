import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { isBlank } from '@ember/utils';
import { action, set } from '@ember/object';
import { timeout } from 'ember-concurrency';
import { task } from 'ember-concurrency-decorators';
import contextComponentCallback from '@fleetbase/ember-core/utils/context-component-callback';

export default class FleetPanelVehicleListingComponent extends Component {
    @service store;
    @service fetch;
    @service intl;
    @service universe;

    /**
     * The selected vehicles.
     *
     * @var {Array}
     * @memberof FleetPanelVehicleListingComponent
     */
    @tracked selected = [];

    /**
     * Determines if list of vehicles should be selectable.
     *
     * @var {Boolean}
     * @memberof FleetPanelVehicleListingComponent
     */
    @tracked selectable = false;

    /**
     * The fleet managing vehicles for.
     *
     * @var {FleetModel}
     * @memberof FleetPanelVehicleListingComponent
     */
    @tracked fleet = [];

    /**
     * Creates an instance of FleetPanelVehicleListingComponent.
     * @memberof FleetPanelVehicleListingComponent
     */
    constructor() {
        super(...arguments);
        const { options = {} } = this.args;

        this.fleet = this.args.fleet;
        this.selectable = this.args.selectable === true || options.selectable === true;
        this.search.perform({ limit: -1 });
    }

    /**
     * Fetches fleet vehicles based on the given parameters.
     * @param {Object} params - Parameters to filter the vehicles.
     * @returns {Promise} Promise object representing the fetched vehicles.
     * @memberof FleetPanelVehicleListringComponent
     */
    fetchFleetVehicles(params = {}) {
        return this.store.query('vehicle', { fleet: this.fleet.id, ...params }).then((vehicles) => {
            set(this, 'vehicles', vehicles.toArray());
            contextComponentCallback(this, 'onLoaded', vehicles);

            return vehicles;
        });
    }

    /**
     * Searches for fleet vehicles based on the given parameters.
     * @task
     * @param {Object} params - Search parameters.
     * @memberof FleetPanelVehicleListringComponent
     */
    @task({ restartable: true }) *search(params = {}) {
        if (!isBlank(params.value)) {
            yield timeout(300);
        }

        yield this.fetchFleetVehicles(params);
    }

    /**
     * Handles input events to initiate search.
     * @action
     * @param {Object} event - The input event.
     * @memberof FleetPanelVehicleListringComponent
     */
    @action onInput({ target: { value } }) {
        this.search.perform({ query: value });
    }

    /**
     * Assigns a vehicle to the fleet.
     * @action
     * @param {VehicleModel} vehicle - The vehicle to be added.
     * @memberof FleetPanelVehicleListringComponent
     */
    @action async onAddVehicle(vehicle) {
        try {
            await this.fetch.post('fleets/assign-vehicle', { vehicle: vehicle.id, fleet: this.fleet.id });
            this.vehicles.pushObject(vehicle);
            this.universe.trigger('fleet-ops.fleet.vehicle_assigned', this.fleet, vehicle);
        } catch (error) {
            this.notifications.serverError(error);
        }
    }

    /**
     * Removes a vehicle from the fleet.
     * @action
     * @param {VehicleModel} vehicle - The vehicle to be removed.
     * @memberof FleetPanelVehicleListringComponent
     */
    @action async onRemoveVehicle(vehicle) {
        try {
            await this.fetch.post('fleets/remove-vehicle', { vehicle: vehicle.id, fleet: this.fleet.id });
            this.vehicles.removeObject(vehicle);
            this.universe.trigger('fleet-ops.fleet.vehicle_unassigned', this.fleet, vehicle);
        } catch (error) {
            this.notifications.serverError(error);
        }
    }

    /**
     * Selects or deselects a vehicle.
     * @action
     * @param {VehicleModel} vehicle - The vehicle to be selected or deselected.
     * @memberof FleetPanelVehicleListringComponent
     */
    @action onSelect(vehicle) {
        if (this.selected.includes(vehicle)) {
            this.selected.removeObject(vehicle);
        } else {
            this.selected.pushObject(vehicle);
        }

        contextComponentCallback(this, 'onSelect', ...arguments);
    }
}

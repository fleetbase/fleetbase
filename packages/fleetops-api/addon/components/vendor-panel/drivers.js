import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { isBlank } from '@ember/utils';
import { action, set } from '@ember/object';
import { timeout } from 'ember-concurrency';
import { task } from 'ember-concurrency-decorators';
import contextComponentCallback from '@fleetbase/ember-core/utils/context-component-callback';

export default class VendorPanelDriversComponent extends Component {
    @service store;
    @service fetch;
    @service intl;
    @service universe;
    @service notifications;

    /**
     * The selected drivers.
     *
     * @var {Array}
     * @memberof VendorPanelDriversComponent
     */
    @tracked selected = [];

    /**
     * Determines if list of drivers should be selectable.
     *
     * @var {Boolean}
     * @memberof VendorPanelDriversComponent
     */
    @tracked selectable = false;

    /**
     * The vendor managing drivers for.
     *
     * @var {VendorModel}
     * @memberof VendorPanelDriversComponent
     */
    @tracked vendor;

    /**
     * Creates an instance of VendorPanelDriversComponent.
     * @memberof VendorPanelDriversComponent
     */
    constructor() {
        super(...arguments);
        const { options = {} } = this.args;

        this.vendor = this.args.vendor;
        this.selectable = this.args.selectable === true || options.selectable === true;
        this.search.perform({ limit: -1 });
    }

    /**
     * Fetches vendor drivers based on the given parameters.
     * @param {Object} params - Parameters to filter the drivers.
     * @returns {Promise} Promise object representing the fetched drivers.
     * @memberof VendorPanelDriversComponent
     */
    fetchVendorDrivers(params = {}) {
        return this.store.query('driver', { facilitator: this.vendor.id, ...params }).then((drivers) => {
            set(this, 'drivers', drivers.toArray());
            contextComponentCallback(this, 'onLoaded', drivers);

            return drivers;
        });
    }

    /**
     * Searches for vendor drivers based on the given parameters.
     * @task
     * @param {Object} params - Search parameters.
     * @memberof VendorPanelDriversComponent
     */
    @task({ restartable: true }) *search(params = {}) {
        if (!isBlank(params.value)) {
            yield timeout(300);
        }

        yield this.fetchVendorDrivers(params);
    }

    /**
     * Handles input events to initiate search.
     * @action
     * @param {Object} event - The input event.
     * @memberof VendorPanelDriversComponent
     */
    @action onInput({ target: { value } }) {
        this.search.perform({ query: value });
    }

    /**
     * Assigns a driver to the vendor.
     * @action
     * @param {DriverModel} driver - The driver to be added.
     * @memberof VendorPanelDriversComponent
     */
    @action async onAddDriver(driver) {
        try {
            await this.fetch.post(`vendors/${this.vendor.id}/assign-driver`, { driver: driver.id });
            this.drivers.pushObject(driver);
            this.universe.trigger('fleet-ops.vendor.driver_assigned', this.vendor, driver);
        } catch (error) {
            this.notifications.serverError(error);
        }
    }

    /**
     * Removes a driver from the vendor.
     * @action
     * @param {DriverModel} driver - The driver to be removed.
     * @memberof VendorPanelDriversComponent
     */
    @action async onRemoveDriver(driver) {
        try {
            await this.fetch.post(`vendors/${this.vendor.id}/remove-driver`, { driver: driver.id });
            this.drivers.removeObject(driver);
            this.universe.trigger('fleet-ops.vendor.driver_unassigned', this.vendor, driver);
        } catch (error) {
            this.notifications.serverError(error);
        }
    }

    /**
     * Selects or deselects a driver.
     * @action
     * @param {DriverModel} driver - The driver to be selected or deselected.
     * @memberof VendorPanelDriversComponent
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

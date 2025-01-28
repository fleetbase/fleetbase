import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action, computed } from '@ember/object';
import { isArray } from '@ember/array';
import { isBlank } from '@ember/utils';
import { timeout } from 'ember-concurrency';
import { task } from 'ember-concurrency-decorators';

export default class FleetVehicleListingComponent extends Component {
    @service store;
    @service appCache;
    @tracked vehicles = [];
    @tracked selected = [];
    @tracked query;
    @tracked isLoading = false;
    @tracked isLoaded = false;

    @computed('selected.[]') get ids() {
        return this.selected.map((selection) => selection.id);
    }

    @action async setupComponent() {
        const { selected, fleet } = this.args;

        this.selected = isArray(selected) && selected.length ? selected : [];
        this.vehicles = await this.queryFleetVehicles(fleet);
    }

    @action setSelected() {
        const { selected } = this.args;

        if (isArray(selected) && selected.length) {
            this.selected = selected;
        }
    }

    @action select(option, selected) {
        if (selected) {
            this.selected.pushObject(option);
        } else {
            this.selected.removeObject(option);
        }

        option.setProperties({ selected });

        if (typeof this.args.onChange === 'function') {
            this.args.onChange(this.selected);
        }
    }

    @action onAdd(vehicle) {
        if (typeof this.args.onRemoveVehicle === 'function') {
            this.args.onAddVehicle(vehicle);
        }

        const index = this.vehicles.findIndex((d) => d.id === vehicle.id);

        if (index === -1) {
            this.vehicles.pushObject(vehicle);
        }
    }

    @action onRemove(vehicle) {
        if (typeof this.args.onRemoveVehicle === 'function') {
            this.args.onRemoveVehicle(vehicle);
        }

        this.vehicles.removeObject(vehicle);
    }

    @action queryFleetVehicles(fleet, query = null) {
        this.isLoading = true;

        const cacheKey = `${fleet.id}:fleetVehicles`;
        // const cachedResults = this.appCache.getEmberData(cacheKey, 'vehicle');

        // if (cachedResults) {
        //     this.vehicles = this.toggleSelected(cachedResults);
        //     this.isLoaded = true;
        // }

        return new Promise((resolve) => {
            this.store.query('vehicle', { query, fleet: fleet.id }).then((vehicles) => {
                this.isLoading = false;
                this.isLoaded = true;

                // save to cache
                if (!query) {
                    this.appCache.setEmberData(cacheKey, vehicles);
                }

                resolve(this.toggleSelected(vehicles));
            });
        });
    }

    @action toggleSelected(options = []) {
        return options.map((option) => {
            option.set('selected', this.ids.includes(option.id));

            return option;
        });
    }

    @task({ restartable: true }) *search({ target: { value } }) {
        const { fleet } = this.args;

        if (isBlank(value)) {
            return;
        }

        yield timeout(300);

        this.vehicles = yield this.queryFleetVehicles(fleet, value);
    }
}

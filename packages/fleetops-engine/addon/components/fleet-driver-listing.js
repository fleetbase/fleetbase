import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action, computed } from '@ember/object';
import { isArray } from '@ember/array';
import { isBlank } from '@ember/utils';
import { timeout } from 'ember-concurrency';
import { task } from 'ember-concurrency-decorators';

export default class FleetDriverListingComponent extends Component {
    @service store;
    @service appCache;
    @tracked drivers = [];
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
        this.drivers = await this.queryFleetDrivers(fleet);
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

    @action onAdd(driver) {
        if (typeof this.args.onRemoveDriver === 'function') {
            this.args.onAddDriver(driver);
        }

        const index = this.drivers.findIndex((d) => d.id === driver.id);

        if (index === -1) {
            this.drivers.pushObject(driver);
        }
    }

    @action onRemove(driver) {
        if (typeof this.args.onRemoveDriver === 'function') {
            this.args.onRemoveDriver(driver);
        }

        this.drivers.removeObject(driver);
    }

    @action queryFleetDrivers(fleet, query = null) {
        this.isLoading = true;

        const cacheKey = `${fleet.id}:fleetDrivers`;
        // const cachedResults = this.appCache.getEmberData(cacheKey, 'driver');

        // if (cachedResults) {
        //     this.drivers = this.toggleSelected(cachedResults);
        //     this.isLoaded = true;
        // }

        return new Promise((resolve) => {
            this.store.query('driver', { query, fleet: fleet.id }).then((drivers) => {
                this.isLoading = false;
                this.isLoaded = true;

                // save to cache
                if (!query) {
                    this.appCache.setEmberData(cacheKey, drivers);
                }

                resolve(this.toggleSelected(drivers));
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

        this.drivers = yield this.queryFleetDrivers(fleet, value);
    }
}

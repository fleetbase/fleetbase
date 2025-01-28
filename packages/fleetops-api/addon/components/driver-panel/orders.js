import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action, computed } from '@ember/object';
import { task } from 'ember-concurrency-decorators';

export default class CustomerOrderHistoryComponent extends Component {
    @service store;
    @service fetch;
    @service intl;
    @service hostRouter;
    @tracked orders = [];
    @tracked driver;

    @computed('args.title') get title() {
        return this.args.title ?? this.intl.t('fleetops.component.widget.orders.widget-title');
    }

    constructor() {
        super(...arguments);
        this.driver = this.args.driver;
        this.queryOrders.perform();
    }

    @task *queryOrders(params = {}) {
        try {
            this.orders = yield this.store.query('order', {
                driver_assigned_uuid: this.driver.id,
                sort: '-created_at',
                ...params,
            });
        } catch (error) {
            this.notifications.serverError('error', error);
        }
    }

    @action search(event) {
        this.queryOrders.perform({ query: event.target.value ?? '' });
    }

    @action async viewOrder(order) {
        this.hostRouter.transitionTo('console.fleet-ops.operations.orders.index.view', order);
    }
}

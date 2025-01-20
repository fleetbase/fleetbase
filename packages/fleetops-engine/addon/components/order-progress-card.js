import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { later } from '@ember/runloop';
import { isBlank } from '@ember/utils';
import { task } from 'ember-concurrency';
import registerComponent from '../utils/register-component';
import OrderProgressBarComponent from './order-progress-bar';

export default class OrderProgressCardComponent extends Component {
    @service fetch;
    @service notifications;
    @tracked order;

    constructor(owner, { order }) {
        super(...arguments);
        registerComponent(owner, OrderProgressBarComponent, { as: 'order-progress-bar' });

        this.order = order;
        later(
            this,
            () => {
                this.loadTrackerData.perform();
            },
            100
        );
    }

    @action handleClick() {
        if (typeof this.args.onClick === 'function') {
            this.args.onClick(this.order);
        }
    }

    @task *loadTrackerData() {
        if (!isBlank(this.order.tracker_data)) {
            return;
        }

        try {
            yield this.order.loadTrackerData({}, { fromCache: true, expirationInterval: 20, expirationIntervalUnit: 'minute' });

            if (typeof this.args.onTrackerDataLoaded === 'function') {
                this.args.onTrackerDataLoaded(this.order);
            }
        } catch (error) {
            console.trace(error);
            this.notifications.serverError(error);
        }
    }
}

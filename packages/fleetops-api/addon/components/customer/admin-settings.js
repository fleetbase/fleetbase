import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { isEmpty } from '@ember/utils';
import { task } from 'ember-concurrency';
import config from 'ember-get-config';

export default class CustomerAdminSettingsComponent extends Component {
    @service fetch;
    @service store;
    @service notifications;
    @tracked orderConfigs = [];
    @tracked enabledOrderConfigs = [];
    @tracked paymentsEnabled = false;
    @tracked paymentsOnboardCompleted = false;
    @tracked paymentGateway = 'stripe';

    get isStripeEnabled() {
        return window.stripeInstance !== undefined || !isEmpty(config.stripe.publishableKey);
    }

    constructor() {
        super(...arguments);
        this.loadOrderConfigs.perform();
    }

    @task *loadOrderConfigs() {
        try {
            this.orderConfigs = this.store.findAll('order-config');
        } catch (error) {
            this.notifications.serverError(error);
        }

        try {
            this.enabledOrderConfigs = yield this.fetch.get('fleet-ops/settings/customer-enabled-order-configs');
        } catch (error) {
            this.notifications.serverError(error);
        }

        try {
            const paymentsConfig = yield this.fetch.get('fleet-ops/settings/customer-payments-config');
            if (paymentsConfig) {
                this.paymentsEnabled = paymentsConfig.paymentsEnabled;
                this.paymentsOnboardCompleted = paymentsConfig.paymentsOnboardCompleted;
            }
        } catch (error) {
            this.notifications.serverError(error);
        }
    }

    @task *toggleOrderConfig(orderConfig) {
        const inlcudesOrderConfig = this.enabledOrderConfigs.find((id) => id === orderConfig.id);
        if (inlcudesOrderConfig) {
            this.enabledOrderConfigs.removeObject(orderConfig.id);
        } else {
            this.enabledOrderConfigs.pushObject(orderConfig.id);
        }

        try {
            yield this.fetch.post('fleet-ops/settings/customer-enabled-order-configs', { enabledOrderConfigs: this.enabledOrderConfigs });
            this.notifications.success('Settings saved.');
        } catch (error) {
            this.notifications.serverError(error);
        }
    }

    @task *togglePayments(enabled) {
        if (!this.isStripeEnabled) {
            this.paymentsEnabled = false;
            return this.notifications.warning('You must configure Stripe first to accept payments.');
        }

        this.paymentsEnabled = enabled;

        try {
            yield this.fetch.post('fleet-ops/settings/customer-payments-config', { paymentsConfig: { paymentsEnabled: this.paymentsEnabled, paymentGateway: 'stripe' } });
            this.notifications.success('Settings saved.');
        } catch (error) {
            this.notifications.serverError(error);
        }
    }
}

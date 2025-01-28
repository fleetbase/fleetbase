import Controller from '@ember/controller';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { task } from 'ember-concurrency';
import { loadConnectAndInitialize } from '@stripe/connect-js';
import config from 'ember-get-config';

export default class SettingsPaymentsOnboardController extends Controller {
    @service fetch;
    @service notifications;
    @tracked connectedAccountId;
    @tracked onboardInProgress = false;
    @tracked onboardCompleted = false;

    @task *startOnboard() {
        try {
            const { account } = yield this.fetch.post('fleet-ops/payments/stripe-account');

            this.connectedAccountId = account;
            this.onboardInProgress = true;

            const instance = loadConnectAndInitialize({
                publishableKey: config.stripe.publishableKey,
                fetchClientSecret: this.fetchClientSecret.bind(this),
                appearance: {
                    overlays: 'dialog',
                    variables: {
                        colorPrimary: '#635BFF',
                    },
                },
            });

            const container = this.getTrackedElement('embeddedOnboardingContainer');
            const embeddedOnboardingComponent = instance.create('account-onboarding');
            embeddedOnboardingComponent.setOnExit(() => {
                this.onboardInProgress = false;
                this.onboardCompleted = true;
            });
            container.appendChild(embeddedOnboardingComponent);
        } catch (error) {
            this.notifications.serverError(error);
        }
    }

    async fetchClientSecret() {
        try {
            const { clientSecret } = await this.fetch.post('fleet-ops/payments/stripe-account-session', { account: this.connectedAccountId });

            return clientSecret;
        } catch (error) {
            this.notifications.serverError(error);
        }
    }

    @action createTrackedElement(name, el) {
        this[name] = el;
    }

    getTrackedElement(name) {
        if (this[name] instanceof HTMLElement) {
            return this[name];
        }

        return null;
    }
}

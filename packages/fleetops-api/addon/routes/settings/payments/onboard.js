import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import { isEmpty } from '@ember/utils';
import config from 'ember-get-config';

export default class SettingsPaymentsOnboardRoute extends Route {
    @service fetch;
    @service notifications;
    @service hostRouter;
    @service abilities;
    @service intl;

    get isStripeEnabled() {
        return window.stripeInstance !== undefined || !isEmpty(config.stripe.publishableKey);
    }

    async beforeModel() {
        if (!this.isStripeEnabled) {
            this.notifications.warning('This system is unable to acceot or process payments at this time, contact the system administrator to configure payments.');
            return this.hostRouter.transitionTo('console.fleet-ops.settings.payments.index');
        }

        if (this.abilities.cannot('fleet-ops onboard payments')) {
            this.notifications.warning(this.intl.t('common.unauthorized-access'));
            return this.hostRouter.transitionTo('console.fleet-ops.settings.payments.index');
        }

        try {
            const { hasStripeConnectAccount } = await this.fetch.get('fleet-ops/payments/has-stripe-connect-account');
            if (hasStripeConnectAccount) {
                this.notifications.info('Your account is already enabled to accept payments.');
                return this.hostRouter.transitionTo('console.fleet-ops.settings.payments.index');
            }
        } catch (error) {
            this.notifications.serverError(error);
            return this.hostRouter.transitionTo('console.fleet-ops.settings.payments.index');
        }
    }
}

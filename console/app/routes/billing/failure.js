import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

export default class BillingFailureRoute extends Route {
    @service notifications;
    @service router;

    model(params) {
        // Log the failure
        console.log('Billing failure params:', params);

        // Clear any stored subscription details
        sessionStorage.removeItem('subscription_details');

        return {
            queryParams: this.paramsFor('billing.failure')
        };
    }

    afterModel() {
        this.notifications.error('Payment setup was cancelled or failed. Please try again.');

        // Redirect back to onboarding after showing error
        setTimeout(() => {
            this.router.replaceWith('onboard');
        }, 3000);
    }
}
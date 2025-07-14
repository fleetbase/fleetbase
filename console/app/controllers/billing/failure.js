import Controller from '@ember/controller';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';

export default class BillingFailureController extends Controller {
    @service router;
    @service notifications;

    @action
    retryPayment() {
        // Redirect back to onboard to retry payment
        this.router.transitionTo('onboard');
        this.notifications.info('Please complete the onboarding process again to retry payment.');
    }

    @action
    goToOnboard() {
        // Redirect back to onboard
        this.router.transitionTo('onboard');
    }
} 
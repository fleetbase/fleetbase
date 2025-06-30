import Controller from '@ember/controller';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';

export default class BillingSuccessController extends Controller {
    @service router;
    @service session;
    @service notifications;

    @tracked isRedirecting = false;
    @tracked countdown = 3;
    @tracked redirecting = false;
    constructor() {
        super(...arguments);
        this.startCountdown();
    }

    startCountdown() {
        this.redirecting = true;

        const timer = setInterval(() => {
            this.countdown--;

            if (this.countdown <= 0) {
                clearInterval(timer);
                this.redirectToVerification();
            }
        }, 1000);
    }

    redirectToVerification() {
        const accountDetails = sessionStorage.getItem('account_details');

        if (accountDetails) {
            const parsedDetails = JSON.parse(accountDetails);
            const { session } = parsedDetails;

            this.router.transitionTo('onboard.verify-email', {
                queryParams: { hello: session }
            });
        }
    }

    @action
    goToDashboard() {
        this.isRedirecting = true;

        // Optional: Authenticate user if needed
        // if (this.model.apiResponse.token) {
        //     this.session.authenticate('authenticator:token', this.model.apiResponse.token);
        // }

        this.router.transitionTo('console');
    }

    @action
    downloadReceipt() {
        // If the API returns a receipt URL or data
        if (this.model.apiResponse && this.model.apiResponse.receipt_url) {
            window.open(this.model.apiResponse.receipt_url, '_blank');
        } else {
            this.notifications.info('Receipt will be sent to your email address.');
        }
    }
}
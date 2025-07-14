import Controller from '@ember/controller';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';

export default class BillingSuccessController extends Controller {
    @service router;
    @service session;
    @service notifications;

    @tracked isRedirecting = false;
    @tracked redirecting = false;
    @tracked isLoading = true; // Start with loading state

    constructor() {
        super(...arguments);
        // Set loading to false after a short delay to show the success state
        setTimeout(() => {
            this.isLoading = false;
        }, 2000); // Show loading for 2 seconds
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

    @action
    skipCountdown() {
        // Redirect immediately to verification
        const accountDetails = sessionStorage.getItem('account_details');
        
        if (accountDetails) {
            try {
                const parsedDetails = JSON.parse(accountDetails);
                const { session } = parsedDetails;

                this.router.transitionTo('onboard.verify-email', {
                    queryParams: { hello: session }
                }).then(() => {
                    this.notifications.info('Please verify your email to complete your account setup.');
                }).catch((error) => {
                    console.error('❌ Redirect failed:', error);
                    this.notifications.error('Redirect failed. Please try again.');
                });
            } catch (parseError) {
                console.error('Failed to parse account details:', parseError);
                this.notifications.error('Session data corrupted. Please try the onboarding process again.');
                this.router.transitionTo('onboard');
            }
        } else {
            this.notifications.warning('Session expired. Please complete onboarding again.');
            this.router.transitionTo('onboard');
        }
    }
}
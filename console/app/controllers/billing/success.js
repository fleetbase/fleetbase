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
    @tracked redirectTimer = null;

    constructor() {
        super(...arguments);
        this.startCountdown();
    }

    startCountdown() {
        this.redirecting = true;

        this.redirectTimer = setInterval(() => {
            this.countdown--;

            if (this.countdown <= 0) {
                clearInterval(this.redirectTimer);
                this.redirectToVerification();
            }
        }, 1000);
    }

    redirectToVerification() {
        console.log('🚀 Controller: Redirecting to verification page...');
        
        const accountDetails = sessionStorage.getItem('account_details');

        if (accountDetails) {
            try {
                const parsedDetails = JSON.parse(accountDetails);
                const { session } = parsedDetails;

                console.log('📋 Found session for verification redirect:', session ? 'exists' : 'missing');

                this.router.transitionTo('onboard.verify-email', {
                    queryParams: { hello: session }
                }).then(() => {
                    console.log('✅ Successfully redirected to verification');
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
            console.warn('⚠️ No account details found for verification redirect');
            this.notifications.warning('Session expired. Please complete onboarding again.');
            this.router.transitionTo('onboard');
        }
    }

    @action
    goToDashboard() {
        this.isRedirecting = true;

        // Clear the countdown timer if it's still running
        if (this.redirectTimer) {
            clearInterval(this.redirectTimer);
        }

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
        // Clear the countdown timer
        if (this.redirectTimer) {
            clearInterval(this.redirectTimer);
        }
        
        // Redirect immediately
        this.redirectToVerification();
    }

    // Clean up timer when controller is destroyed
    willDestroy() {
        if (this.redirectTimer) {
            clearInterval(this.redirectTimer);
        }
        super.willDestroy();
    }
}
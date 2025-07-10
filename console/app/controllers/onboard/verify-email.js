// app/controllers/onboard/verify-email.js
import AuthVerificationController from '../auth/verification';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';

export default class OnboardVerifyEmailController extends AuthVerificationController {
    @tracked code;
    @tracked hello;
    
    // Add query params to the controller
    queryParams = ['code', 'hello'];
    
    @action verifyCode(event) {
        // Prevent default form submission if this is a form event
        if (event && event.preventDefault) {
            event.preventDefault();
        }
        
        // Get fresh values from URL if controller properties are empty
        if (!this.hello || !this.code) {
            const urlParams = new URLSearchParams(window.location.search);
            this.code = this.code || urlParams.get('code');
            this.hello = this.hello || urlParams.get('hello');
        }
        
        const { hello, code } = this;
        
        // Validation
        if (!hello) {
            this.notifications.error('Missing session information. Please restart the verification process.');
            return;
        }
        
        if (!code || code.length < 4) {
            this.notifications.error('Please enter a valid verification code.');
            return;
        }
        
        // Prevent multiple submissions
        if (this.isLoading) {
            return;
        }

        this.isLoading = true;

        const payload = { session: hello, code };

        return this.fetch
            .post('onboard/verify-email', payload)
            .then((response) => {
                // Check if response is actually a Response object that needs .json()
                if (response && typeof response.json === 'function') {
                    return response.json().then(jsonData => {
                        return this.handleApiResponse(jsonData);
                    });
                } else {
                    return this.handleApiResponse(response);
                }
            })
            .catch((error) => {
                // Handle specific error cases
                if (error.status === 400) {
                    this.notifications.error('Invalid verification code or session expired.');
                } else if (error.status === 404) {
                    this.notifications.error('Verification service not found.');
                } else if (error.status === 422) {
                    this.notifications.error('Invalid request format.');
                } else {
                    this.notifications.serverError(error);
                }
            })
            .finally(() => {
                this.isLoading = false;
            });
    }
    
    handleApiResponse(parsedResponse) {
        const { status, token } = parsedResponse;
        
        if (status === 'ok') {
            this.notifications.success('Email successfully verified!');

            if (token) {
                this.notifications.info('Welcome to FleetYes!');
                let authSucceeded = false;
                try {
                    this.session.manuallyAuthenticate(token);
                    authSucceeded = true;
                } catch (authError) {
                    this.notifications.error('Authentication failed. Please try logging in manually.');
                    return this.router.transitionTo('auth.login');
                }
                if (authSucceeded) {
                    // Only redirect if authentication succeeded
                    return this.hostRouter.transitionTo('console.fleet-ops.operations.orders.index', { queryParams: { layout: 'table', t: Date.now() } })
                        .then(() => {
                            // Force route refresh
                            this.hostRouter.refresh();
                        });
                }
            } else {
                return this.router.transitionTo('auth.login');
            }
        } else {
            const errorMessage = parsedResponse.message || parsedResponse.error || 'Verification failed. Please try again.';
            this.notifications.error(errorMessage);
            
            // Don't redirect, stay on the page to allow retry
            return Promise.resolve();
        }
    }
}
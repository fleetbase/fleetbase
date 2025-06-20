// app/controllers/onboard/verify-email.js
import AuthVerificationController from '../auth/verification';
import { action } from '@ember/object';

export default class OnboardVerifyEmailController extends AuthVerificationController {
    
    @action verifyCode(event) {
        // Prevent default form submission if this is a form event
        if (event && event.preventDefault) {
            event.preventDefault();
        }
        
        const { hello, code } = this;
        
        console.log('=== VERIFICATION DEBUG ===');
        console.log('Hello (session):', hello?.substring(0, 20) + '...');
        console.log('Code:', code);
        console.log('=========================');
        
        // Validation
        if (!hello) {
            console.error('Missing hello (session) parameter');
            this.notifications.error('Missing session information. Please restart the verification process.');
            return;
        }
        
        if (!code || code.length < 4) {
            console.error('Invalid or missing verification code');
            this.notifications.error('Please enter a valid verification code.');
            return;
        }
        
        // Prevent multiple submissions
        if (this.isLoading) {
            console.log('Already processing, ignoring duplicate request');
            return;
        }

        this.isLoading = true;

        const payload = { session: hello, code };
        console.log('Sending payload:', payload);

        return this.fetch
            .post('onboard/verify-email', payload)
            .then((response) => {
                console.log('=== API RESPONSE ===');
                console.log('Full response:', response);
                console.log('Status:', response?.status);
                console.log('Token present:', !!response?.token);
                console.log('==================');
                
                const { status, token } = response;
                
                if (status === 'ok') {
                    this.notifications.success('Email successfully verified!');

                    if (token) {
                        console.log('Token received, authenticating and redirecting to console...');
                        this.notifications.info('Welcome to FleetYes!');
                        this.session.manuallyAuthenticate(token);
                        return this.router.transitionTo('console');
                    } else {
                        console.log('No token received, redirecting to login...');
                        return this.router.transitionTo('auth.login');
                    }
                } else {
                    console.error('Verification failed - Status:', status);
                    const errorMessage = response.message || 'Verification failed. Please try again.';
                    this.notifications.error(errorMessage);
                }
            })
            .catch((error) => {
                console.error('=== VERIFICATION ERROR ===');
                console.error('Error object:', error);
                console.error('Error message:', error.message);
                console.error('Error status:', error.status);
                console.error('========================');
                
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
                console.log('Verification process completed, setting isLoading to false');
                this.isLoading = false;
            });
    }
}
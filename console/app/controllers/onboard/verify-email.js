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
        console.log("1111");
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
        
        console.log('=== VERIFICATION DEBUG ===');
        console.log('Hello (session):', hello?.substring(0, 20) + '...');
        console.log('Code:', code);
        console.log('Current URL:', window.location.href);
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
        console.log('📤 Sending payload:', payload);
        console.log('📤 API endpoint: onboard/verify-email');
        console.log('📤 Full URL will be constructed by fetch service');

        console.log('🚀 Starting API call...');

        return this.fetch
            .post('onboard/verify-email', payload)
            .then((response) => {
                console.log('=== RAW RESPONSE RECEIVED ===');
                console.log('Response received, typeof:', typeof response);
                console.log('Response:', response);
                console.log('Response constructor:', response?.constructor?.name);
                console.log('Is response null/undefined?', response == null);
                
                // Check if response is actually a Response object that needs .json()
                if (response && typeof response.json === 'function') {
                    console.log('⚠️ Response is a Response object, needs .json()');
                    return response.json().then(jsonData => {
                        console.log('📦 Parsed JSON data:', jsonData);
                        return this.handleApiResponse(jsonData);
                    });
                } else {
                    console.log('📦 Response is already parsed data');
                    return this.handleApiResponse(response);
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
    
    handleApiResponse(parsedResponse) {
        console.log('=== HANDLING API RESPONSE ===');
        console.log('Parsed response type:', typeof parsedResponse);
        console.log('Parsed response:', parsedResponse);
        console.log('Response keys:', Object.keys(parsedResponse || {}));
        console.log('Status:', parsedResponse?.status);
        console.log('Token present:', !!parsedResponse?.token);
        console.log('Token value:', parsedResponse?.token);
        console.log('============================');
        
        const { status, token } = parsedResponse;
        
        if (status === 'ok') {
            console.log('✅ Verification successful!');
            this.notifications.success('Email successfully verified!');

            if (token) {
                console.log('🔑 Token received, authenticating and redirecting to console...');
                this.notifications.info('Welcome to FleetYes!');
                
                try {
                    this.session.manuallyAuthenticate(token);
                    console.log('🔐 Authentication successful, transitioning to console...');
                    return this.router.transitionTo('console');
                } catch (authError) {
                    console.error('❌ Authentication failed:', authError);
                    this.notifications.error('Authentication failed. Please try logging in manually.');
                    return this.router.transitionTo('auth.login');
                }
            } else {
                console.log('ℹ️ No token received, redirecting to login...');
                return this.router.transitionTo('auth.login');
            }
        } else {
            console.error('❌ Verification failed - Status:', status);
            console.error('❌ Full response:', parsedResponse);
            const errorMessage = parsedResponse.message || parsedResponse.error || 'Verification failed. Please try again.';
            this.notifications.error(errorMessage);
            
            // Don't redirect, stay on the page to allow retry
            return Promise.resolve();
        }
    }
}
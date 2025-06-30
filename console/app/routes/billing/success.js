import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

export default class BillingSuccessRoute extends Route {
    @service fetch;
    @service notifications;
    @service router;

    async model(params) {
        try {
            console.log('🎯 Billing success route started');
            console.log('🎯 Received params from route:', params);

            // Method 1: Get query parameters from URL manually
            const urlParams = new URLSearchParams(window.location.search);
            const queryParams = {};
            for (let [key, value] of urlParams) {
                queryParams[key] = value;
            }

            console.log('🔍 Current URL:', window.location.href);
            console.log('🔍 URL Search:', window.location.search);
            console.log('🔍 Parsed query params:', JSON.stringify(queryParams, null, 2));

            // Method 2: Also try getting from route transition
            const transition = this.router.currentRoute;
            console.log('🔍 Route query params:', JSON.stringify(transition?.queryParams, null, 2));

            // Method 3: Get from stored subscription details
            const subscriptionDetails = sessionStorage.getItem('subscription_details');
            const accountDetails = sessionStorage.getItem('account_details');
            let storedDetails = null;
            let storedAccountDetails = null;

            if (subscriptionDetails) {
                try {
                    storedDetails = JSON.parse(subscriptionDetails);
                    console.log('💾 Stored subscription details:', JSON.stringify(storedDetails, null, 2));
                } catch (e) {
                    console.error('Failed to parse stored subscription details:', e);
                }
            }

            if (accountDetails) {
                try {
                    storedAccountDetails = JSON.parse(accountDetails);
                    console.log('💾 Stored account details:', JSON.stringify(storedAccountDetails, null, 2));
                } catch (e) {
                    console.error('Failed to parse stored account details:', e);
                }
            }

            // Get route parameters (if any are defined in router.js)
            const routeParams = this.paramsFor('billing.success');
            console.log('📍 Route params:', JSON.stringify(routeParams, null, 2));

            // Combine all possible parameters
            const allParams = {
                ...routeParams,
                ...queryParams,
                ...transition?.queryParams,
                // Add parameters from stored subscription if available
                ...(storedDetails && {
                    billing_request_id: storedDetails.billing_request_id,
                    billing_request_flow_id: storedDetails.billing_request_flow_id
                })
            };

            // Remove any undefined or null values
            const cleanParams = Object.fromEntries(
                Object.entries(allParams).filter(([key, value]) => value !== undefined && value !== null && value !== '')
            );

            console.log('📋 Clean parameters to send:', JSON.stringify(cleanParams, null, 2));
            console.log('📋 Clean parameters keys:', Object.keys(cleanParams));
            console.log('📋 Clean parameters values:', Object.values(cleanParams));

            // Log each parameter individually for debugging
            Object.entries(cleanParams).forEach(([key, value]) => {
                console.log(`📋 Parameter ${key}:`, typeof value, value);
            });

            // Validate required parameters
            const requiredParams = ['billing_request_flow_id', 'billing_request_id'];
            const missingParams = requiredParams.filter(param => !cleanParams[param]);

            if (missingParams.length > 0) {
                console.warn('⚠️ Missing required billing parameters:', missingParams);
                console.log('⚠️ Available parameters:', Object.keys(cleanParams));

                // Try to get from URL fragment or hash
                const hash = window.location.hash;
                if (hash) {
                    console.log('🔍 URL Hash:', hash);
                    // Parse hash parameters if they exist
                    const hashParams = new URLSearchParams(hash.substring(1));
                    for (let [key, value] of hashParams) {
                        cleanParams[key] = value;
                    }
                    console.log('🔍 Hash params added:', JSON.stringify(cleanParams, null, 2));
                }
            }

            // Log the exact payload being sent
            console.log('🚀 About to send to API:', {
                url: 'onboard/billing/success',
                method: 'POST',
                payload: cleanParams,
                payloadSize: JSON.stringify(cleanParams).length
            });

            // Call the billing success API with authentication headers
            const response = await this.fetch.post('onboard/billing/success', cleanParams);

            console.log('✅ Billing success API response:', JSON.stringify(response, null, 2));

            // If successful and we have account details, authenticate the user
            if (response && response.success && storedAccountDetails) {
                const { skipVerification, token, session } = storedAccountDetails;

                if (skipVerification === true && token) {
                    console.log('🔐 Authenticating user with token');
                    this.session.isOnboarding().manuallyAuthenticate(token);

                    // Clean up session storage
                    sessionStorage.removeItem('subscription_details');
                    sessionStorage.removeItem('account_details');
                    console.log('🧹 Cleared session storage');

                    // Redirect to verification page
                    setTimeout(() => {
                        this.router.replaceWith('onboard.verify-email', {
                            queryParams: { hello: session }
                        });
                        this.notifications.success('Payment completed! Please verify your email to complete setup.');
                    }, 1000);
                }
            }

            // Clear subscription details from session storage after successful API call
            if (subscriptionDetails) {
                sessionStorage.removeItem('subscription_details');
                console.log('🧹 Cleared subscription details from session storage');
            }

            return {
                apiResponse: response,
                subscriptionDetails: storedDetails,
                accountDetails: storedAccountDetails,
                queryParams: cleanParams
            };

        } catch (error) {
            console.error('❌ Billing success API error details:', {
                message: error.message,
                status: error.status,
                response: error.response,
                stack: error.stack
            });

            // Handle different types of errors
            if (error.status >= 400 && error.status < 500) {
                console.log('🔒 Client error:', error.status);
                this.notifications.error(`Request failed with status ${error.status}. Please contact support.`);
            } else if (error.status >= 500) {
                console.log('🔥 Server error:', error.status);
                this.notifications.error('Server error occurred. Please contact support.');
            } else {
                console.log('🌐 Network or unknown error');
                this.notifications.error('Network error occurred. Please check your connection.');
            }

            // Try to authenticate user anyway if we have account details
            const accountDetails = sessionStorage.getItem('account_details');
            if (accountDetails) {
                try {
                    const storedAccountDetails = JSON.parse(accountDetails);
                    const { skipVerification, token } = storedAccountDetails;

                    if (skipVerification === true && token) {
                        console.log('🔐 Authenticating user despite API error');
                        this.session.isOnboarding().manuallyAuthenticate(token);

                        // Clean up session storage
                        sessionStorage.removeItem('subscription_details');
                        sessionStorage.removeItem('account_details');

                        // Redirect to console with warning
                        this.router.replaceWith('console');
                        this.notifications.warning('Welcome to FleetYes! There was an issue processing your payment confirmation, but your account is ready. Please contact support if you have billing questions.');
                        return;
                    }
                } catch (parseError) {
                    console.error('Failed to parse account details:', parseError);
                }
            }

            // Redirect to console or dashboard on error
            this.router.replaceWith('console');
            return null;
        }
    }

    // afterModel(model) {
    //     if (model && model.apiResponse) {
    //         // Show success notification
    //         this.notifications.success('Payment completed successfully! Welcome to FleetYes!');
    //     }
    // }
    afterModel(model) {
        console.log('🎯 Payment success page loaded, preparing auto-redirect...');

        // Show success notification immediately
        if (model && model.apiResponse) {
            this.notifications.success('Payment completed successfully!');
        }

        // Get account details for verification redirect
        const accountDetails = sessionStorage.getItem('account_details');

        if (accountDetails) {
            const parsedDetails = JSON.parse(accountDetails);
            const { session } = parsedDetails;

            console.log('📋 Found session for verification redirect:', session ? 'exists' : 'missing');

            // Auto-redirect to verification page after 3 seconds
            setTimeout(() => {
                console.log('🚀 Auto-redirecting to verification page...');

                this.router.replaceWith('onboard.verify-email', {
                    queryParams: { hello: session }
                }).then(() => {
                    console.log('✅ Successfully redirected to verification');
                    this.notifications.info('Please verify your email to complete your account setup.');
                }).catch((error) => {
                    console.error('❌ Redirect failed:', error);
                    this.notifications.error('Redirect failed. Please try again.');
                });
            }, 3000); // 3 second delay to show payment success details

        } else {
            console.warn('⚠️ No account details found for verification redirect');

            // Fallback: redirect to onboard if no session data
            setTimeout(() => {
                this.notifications.warning('Session expired. Please complete onboarding again.');
                this.router.replaceWith('onboard');
            }, 3000);
        }
    }
}
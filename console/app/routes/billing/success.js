import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

export default class BillingSuccessRoute extends Route {
    @service fetch;
    @service notifications;
    @service router;
    @service session;

    async model(params) {
        console.log('🎯 BILLING SUCCESS ROUTE HIT!');
        console.log('🎯 URL:', window.location.href);
        console.log('🎯 Params:', params);
        console.log('🎯 User Agent:', navigator.userAgent);
        console.log('🎯 Domain:', window.location.hostname);
        console.log('🎯 Protocol:', window.location.protocol);
        
        // Debug session storage immediately
        console.log('🔍 Session storage keys:', Object.keys(sessionStorage));
        console.log('🔍 Account details from session storage:', sessionStorage.getItem('account_details'));
        console.log('🔍 Subscription details from session storage:', sessionStorage.getItem('subscription_details'));
        
        // Check if session storage is working
        try {
            sessionStorage.setItem('test_key', 'test_value');
            const testValue = sessionStorage.getItem('test_key');
            console.log('🔍 Session storage test:', testValue === 'test_value' ? 'WORKING' : 'FAILED');
            sessionStorage.removeItem('test_key');
        } catch (e) {
            console.error('❌ Session storage not working:', e);
        }
        
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
            console.log('🔍 Subscription details:', subscriptionDetails);
            
            const accountDetails = sessionStorage.getItem('account_details');
            console.log('🔍 Account details:', accountDetails);
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

            // Map Chargebee parameters to expected API parameters
            const mappedParams = {
                // Map Chargebee parameters to expected API parameters
                subscription_id: queryParams.sub_id,
                invoice_id: queryParams.invoice_id,
                customer_id: queryParams.cus_id || queryParams.id, // Handle both cus_id and id
                payment_status: queryParams.state || 'succeeded', // Default to succeeded if not provided
                // Keep original parameters if they exist
                ...routeParams,
                ...transition?.queryParams,
                // Add parameters from stored subscription if available
                ...(storedDetails && {
                    billing_request_id: storedDetails.billing_request_id,
                    billing_request_flow_id: storedDetails.billing_request_flow_id
                })
            };

            // Add user_uuid and company_uuid from stored account details
            if (storedAccountDetails) {
                mappedParams.user_uuid = storedAccountDetails.user_uuid;
                mappedParams.company_uuid = storedAccountDetails.company_uuid;
                mappedParams.session = storedAccountDetails.session;
                console.log('📋 Using stored account details:', {
                    user_uuid: storedAccountDetails.user_uuid,
                    company_uuid: storedAccountDetails.company_uuid
                });
            } else {
                // If no stored account details, try to get from session storage
                const accountDetails = sessionStorage.getItem('account_details');
                if (accountDetails) {
                    try {
                        const parsedDetails = JSON.parse(accountDetails);
                        mappedParams.user_uuid = parsedDetails.user_uuid;
                        mappedParams.company_uuid = parsedDetails.company_uuid;
                        mappedParams.session = parsedDetails.session;
                        console.log('📋 Retrieved account details from session storage:', {
                            user_uuid: parsedDetails.user_uuid,
                            company_uuid: parsedDetails.company_uuid
                        });
                    } catch (e) {
                        console.error('Failed to parse account details from session storage:', e);
                    }
                }
                
                // Fallback: Try localStorage if session storage failed
                if (!mappedParams.user_uuid || !mappedParams.company_uuid) {
                    console.log('🔍 Trying localStorage as fallback...');
                    const localAccountDetails = localStorage.getItem('account_details');
                    if (localAccountDetails) {
                        try {
                            const parsedLocalDetails = JSON.parse(localAccountDetails);
                            mappedParams.user_uuid = mappedParams.user_uuid || parsedLocalDetails.user_uuid;
                            mappedParams.company_uuid = mappedParams.company_uuid || parsedLocalDetails.company_uuid;
                            mappedParams.session = mappedParams.session || parsedLocalDetails.session;
                            console.log('📋 Retrieved account details from localStorage:', {
                                user_uuid: mappedParams.user_uuid,
                                company_uuid: mappedParams.company_uuid
                            });
                        } catch (e) {
                            console.error('Failed to parse account details from localStorage:', e);
                        }
                    }
                }
                
                // Fallback: Try to get from URL parameters if still missing
                if (!mappedParams.user_uuid || !mappedParams.company_uuid) {
                    console.log('🔍 Trying URL parameters as fallback...');
                    const urlParams = new URLSearchParams(window.location.search);
                    const urlUserUuid = urlParams.get('user_uuid');
                    const urlCompanyUuid = urlParams.get('company_uuid');
                    const urlSession = urlParams.get('session');
                    
                    if (urlUserUuid && urlCompanyUuid) {
                        mappedParams.user_uuid = mappedParams.user_uuid || urlUserUuid;
                        mappedParams.company_uuid = mappedParams.company_uuid || urlCompanyUuid;
                        mappedParams.session = mappedParams.session || urlSession;
                        console.log('📋 Retrieved account details from URL parameters:', {
                            user_uuid: mappedParams.user_uuid,
                            company_uuid: mappedParams.company_uuid
                        });
                    }
                }
            }

            // Ensure user_uuid and company_uuid are always included
            if (!mappedParams.user_uuid || !mappedParams.company_uuid) {
                console.error('❌ Missing user_uuid or company_uuid');
                console.log('❌ Current mappedParams:', mappedParams);
                console.log('❌ Stored account details:', storedAccountDetails);
                console.log('❌ Session storage account details:', sessionStorage.getItem('account_details'));
                
                // Try to get from session storage as fallback
                const fallbackAccountDetails = sessionStorage.getItem('account_details');
                if (fallbackAccountDetails) {
                    try {
                        const parsedFallback = JSON.parse(fallbackAccountDetails);
                        mappedParams.user_uuid = mappedParams.user_uuid || parsedFallback.user_uuid;
                        mappedParams.company_uuid = mappedParams.company_uuid || parsedFallback.company_uuid;
                        console.log('📋 Using fallback account details:', {
                            user_uuid: mappedParams.user_uuid,
                            company_uuid: mappedParams.company_uuid
                        });
                    } catch (e) {
                        console.error('Failed to parse fallback account details:', e);
                    }
                }
            }

            // Remove any undefined or null values
            const cleanParams = Object.fromEntries(
                Object.entries(mappedParams).filter(([key, value]) => value !== undefined && value !== null && value !== '')
            );

            // Debug: Check if user_uuid and company_uuid are still present after filtering
            console.log('🔍 After filtering - user_uuid:', cleanParams.user_uuid);
            console.log('🔍 After filtering - company_uuid:', cleanParams.company_uuid);
            console.log('🔍 All cleanParams keys:', Object.keys(cleanParams));

            // Ensure user_uuid and company_uuid are in cleanParams
            if (!cleanParams.user_uuid || !cleanParams.company_uuid) {
                console.error('❌ user_uuid or company_uuid missing from cleanParams after filtering');
                console.log('❌ Original mappedParams:', mappedParams);
                console.log('❌ CleanParams after filtering:', cleanParams);
                
                // Force add them if they exist in mappedParams
                if (mappedParams.user_uuid) cleanParams.user_uuid = mappedParams.user_uuid;
                if (mappedParams.company_uuid) cleanParams.company_uuid = mappedParams.company_uuid;
                
                console.log('🔧 Forced addition - user_uuid:', cleanParams.user_uuid);
                console.log('🔧 Forced addition - company_uuid:', cleanParams.company_uuid);
            }

            console.log('📋 Clean parameters to send:', JSON.stringify(cleanParams, null, 2));
            console.log('📋 Clean parameters keys:', Object.keys(cleanParams));
            console.log('📋 Clean parameters values:', Object.values(cleanParams));

            // Log each parameter individually for debugging
            Object.entries(cleanParams).forEach(([key, value]) => {
                console.log(`📋 Parameter ${key}:`, typeof value, value);
            });

            // Validate that we have at least some payment-related parameters
            const paymentParams = ['subscription_id', 'invoice_id', 'customer_id'];
            const hasPaymentParams = paymentParams.some(param => cleanParams[param]);

            if (!hasPaymentParams) {
                console.warn('⚠️ No payment parameters found in URL');
                console.log('⚠️ Available parameters:', Object.keys(cleanParams));
                console.log('⚠️ Expected parameters: sub_id, invoice_id, cus_id');
            } else {
                console.log('✅ Payment parameters found:', {
                    subscription_id: cleanParams.subscription_id,
                    invoice_id: cleanParams.invoice_id,
                    customer_id: cleanParams.customer_id
                });
            }

            // Validate required parameters for API call
            const requiredParams = ['user_uuid', 'company_uuid', 'subscription_id', 'customer_id'];
            const missingParams = requiredParams.filter(param => !cleanParams[param]);
            
            if (missingParams.length > 0) {
                console.error('❌ Missing required parameters for API call:', missingParams);
                console.log('❌ Available parameters:', Object.keys(cleanParams));
                console.log('❌ Server environment detected - trying alternative approaches...');
                
                // For server environments, try to get missing params from alternative sources
                if (missingParams.includes('user_uuid') || missingParams.includes('company_uuid')) {
                    console.log('🔍 Attempting to recover user_uuid and company_uuid...');
                    
                    // Try to get from localStorage
                    const localAccountDetails = localStorage.getItem('account_details');
                    if (localAccountDetails) {
                        try {
                            const parsedLocal = JSON.parse(localAccountDetails);
                            if (!cleanParams.user_uuid && parsedLocal.user_uuid) {
                                cleanParams.user_uuid = parsedLocal.user_uuid;
                                console.log('✅ Recovered user_uuid from localStorage');
                            }
                            if (!cleanParams.company_uuid && parsedLocal.company_uuid) {
                                cleanParams.company_uuid = parsedLocal.company_uuid;
                                console.log('✅ Recovered company_uuid from localStorage');
                            }
                        } catch (e) {
                            console.error('Failed to parse localStorage account details:', e);
                        }
                    }
                    
                    // Re-check after recovery
                    const stillMissing = requiredParams.filter(param => !cleanParams[param]);
                    if (stillMissing.length > 0) {
                        console.error('❌ Still missing parameters after recovery:', stillMissing);
                        throw new Error(`Missing required parameters: ${stillMissing.join(', ')}`);
                    } else {
                        console.log('✅ All required parameters recovered successfully');
                    }
                } else {
                    throw new Error(`Missing required parameters: ${missingParams.join(', ')}`);
                }
            }

            console.log('✅ All required parameters present for API call');

            // Test the fetch service first
            try {
                console.log('🧪 Testing fetch service...');
                const testResponse = await this.fetch.get('onboard/pricing-plans/latest');
                console.log('✅ Fetch service test successful:', testResponse ? 'YES' : 'NO');
            } catch (testError) {
                console.error('❌ Fetch service test failed:', testError);
                console.error('❌ This might indicate a network or service issue');
            }

            // Log the exact payload being sent
            console.log('🚀 About to send to API:', {
                url: 'onboard/billing-success',
                method: 'POST',
                payload: cleanParams,
                payloadSize: JSON.stringify(cleanParams).length
            });

            // Call the billing success API with the mapped parameters
            let response;
            try {
                console.log('🚀 Making API call to onboard/billing-success...');
                console.log('🚀 API call starting at:', new Date().toISOString());
                response = await this.fetch.post('onboard/billing-success', cleanParams);
                console.log('✅ Billing success API response:', JSON.stringify(response, null, 2));
                console.log('✅ API call completed at:', new Date().toISOString());
            } catch (apiError) {
                console.error('❌ API call failed:', apiError);
                console.error('❌ Error message:', apiError.message);
                console.error('❌ Error status:', apiError.status);
                console.error('❌ Error response:', apiError.response);
                console.error('❌ Full error object:', apiError);
                console.error('❌ API call failed at:', new Date().toISOString());
                
                // Re-throw the error to be caught by the outer catch block
                throw apiError;
            }

            // If successful and we have account details, authenticate the user
            if (response && response.success && storedAccountDetails) {
                const { skipVerification, token, session } = storedAccountDetails;

                if (skipVerification === true && token) {
                    console.log('🔐 Authenticating user with token');
                    try {
                        // Try to authenticate with the token
                        await this.session.authenticate('authenticator:fleetbase', { token });
                        console.log('✅ User authenticated successfully');
                    } catch (authError) {
                        console.warn('⚠️ Authentication failed:', authError);
                        // Continue without authentication - user can still access the success page
                    }

                    // Don't clear session storage here - let afterModel handle it
                    console.log('🔐 User authenticated, session storage preserved for redirect');
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
            console.error('❌ Error occurred at:', new Date().toISOString());

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
                        try {
                            // Try to authenticate with the token
                            await this.session.authenticate('authenticator:fleetbase', { token });
                            console.log('✅ User authenticated successfully despite API error');
                        } catch (authError) {
                            console.warn('⚠️ Authentication failed despite API error:', authError);
                        }

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

    afterModel(model) {
        console.log('🎯 Payment success page loaded');
        console.log('🎯 Model data received:', model ? 'YES' : 'NO');
        if (model) {
            console.log('🎯 Model has apiResponse:', model.apiResponse ? 'YES' : 'NO');
            console.log('🎯 Model has subscriptionDetails:', model.subscriptionDetails ? 'YES' : 'NO');
            console.log('🎯 Model has accountDetails:', model.accountDetails ? 'YES' : 'NO');
            console.log('🎯 Model has queryParams:', model.queryParams ? 'YES' : 'NO');
        }

        // Show success notification immediately
        if (model && model.apiResponse) {
            this.notifications.success('Payment completed successfully!');
        }

        // Set loading to false in controller after processing
        const controller = this.controllerFor('billing.success');
        if (controller) {
            // Set loading to false after API processing is complete
            setTimeout(() => {
                controller.isLoading = false;
            }, 1000); // Show loading for 1 second after API call
        }

        // Get stored account details for redirect
        const accountDetails = sessionStorage.getItem('account_details');
        
        console.log('🔍 Account details from session storage:', accountDetails);
        
        if (accountDetails) {
            try {
                const parsedDetails = JSON.parse(accountDetails);
                const { session } = parsedDetails;

                console.log('📋 Parsed account details:', parsedDetails);
                console.log('📋 Session for verification redirect:', session ? 'exists' : 'missing');
                console.log('📋 Session value:', session);

                // Redirect to verification page after a short delay
                setTimeout(() => {
                    console.log('🚀 Redirecting to verification with session:', session);
                    this.router.transitionTo('onboard.verify-email', {
                        queryParams: { hello: session }
                    }).then(() => {
                        console.log('✅ Successfully redirected to verification');
                        this.notifications.info('Please verify your email to complete your account setup.');
                        
                        // Clean up session storage after successful redirect
                        sessionStorage.removeItem('subscription_details');
                        sessionStorage.removeItem('account_details');
                        console.log('🧹 Cleared session storage after successful redirect');
                    }).catch((error) => {
                        console.error('❌ Redirect failed:', error);
                        this.notifications.error('Redirect failed. Please try again.');
                    });
                }, 2000); // 2 second delay to show success message
            } catch (parseError) {
                console.error('Failed to parse account details:', parseError);
                this.notifications.error('Session data corrupted. Please try the onboarding process again.');
                this.router.transitionTo('onboard');
            }
        } else {
            console.warn('⚠️ No account details found for verification redirect');
            console.log('🔍 Session storage keys:', Object.keys(sessionStorage));
            
            // Check if user is already authenticated
            if (this.session.isAuthenticated) {
                console.log('✅ User is already authenticated, redirecting to console');
                // If user is authenticated, redirect to console with success message
                setTimeout(() => {
                    this.router.transitionTo('console');
                    this.notifications.success('Payment successful! Welcome to FleetYes.');
                }, 2000);
            } else {
                // If not authenticated and no session, redirect to login with success message
                console.log('🔍 User not authenticated, redirecting to login');
                this.notifications.warning('Payment successful! Please log in to complete your account setup.');
                this.router.transitionTo('auth.login', {
                    queryParams: { 
                        payment_success: 'true',
                        message: 'Payment completed successfully. Please log in to continue.'
                    }
                });
            }
        }
    }
}
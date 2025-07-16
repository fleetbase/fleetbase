import Controller from '@ember/controller';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action, getProperties, set } from '@ember/object';
import OnboardValidations from '../../validations/onboard';
import lookupValidator from 'ember-changeset-validations';
import Changeset from 'ember-changeset';
import ENV from '@fleetbase/console/config/environment';
import showErrorOnce from '@fleetbase/console/utils/show-error-once';
import { inject as intlService } from '@ember/service';

export default class OnboardIndexController extends Controller {
    /**
     * Inject the `fetch` service
     *
     * @memberof OnboardIndexController
     */
    @service fetch;

    /**
     * Inject the `session` service
     *
     * @memberof OnboardIndexController
     */
    @service session;

    /**
     * Inject the `router` service
     *
     * @memberof OnboardIndexController
     */
    @service router;

    /**
     * Inject the `notifications` service
     *
     * @memberof OnboardIndexController
     */
    @service notifications;

    /**
     * Inject the `intl` service
     *
     * @memberof OnboardIndexController
     */
    @service intl;
    // @service chargebee;

    /**
     * The name input field.
     *
     * @memberof OnboardIndexController
     */
    @tracked name;

    /**
     * The email input field.
     *
     * @memberof OnboardIndexController
     */
    @tracked email;

    /**
     * The phone input field.
     *
     * @memberof OnboardIndexController
     */
    @tracked phone;

    /**
     * The organization_name input field.
     *
     * @memberof OnboardIndexController
     */
    @tracked organization_name;

    /**
     * The password input field.
     *
     * @memberof OnboardIndexController
     */
    @tracked password;

    /**
     * The name password confirmation field.
     *
     * @memberof OnboardIndexController
     */
    @tracked password_confirmation;

    /**
     * The property for error message.
     *
     * @memberof OnboardIndexController
     */
    @tracked error;

    /**
     * The loading state of the onboard request.
     *
     * @memberof OnboardIndexController
     */
    @tracked isLoading = false;

    /**
     * The ready state for the form.
     *
     * @memberof OnboardIndexController
     */
    @tracked readyToSubmit = false;

    /**
     * The available languages.
     *
     * @memberof OnboardIndexController
     */
    @tracked languages = [];

    /**
     * The selected language.
     *
     * @memberof OnboardIndexController
     */
    @tracked language;
    @tracked showPaymentFrame = false;
    @tracked paymentUrl = null;
    @tracked subscriptionDetails = null;
    @tracked iframePollingInterval = null;

    constructor() {
        super(...arguments);
        this.loadLanguages();
        this.setupIframeMessageListener();
    }

    /**
     * Setup message listener for iframe communication
     */
    setupIframeMessageListener() { 
        window.addEventListener('message', (event) => {
            // Check if the message is from our payment iframe
            if (event.origin !== window.location.origin) {
                return;
            }

            console.log('📨 Received message from iframe:', event.data);

            // Handle payment success
            if (event.data && event.data.type === 'payment_success') {
                console.log('✅ Payment success message received from iframe');
                this.handlePaymentSuccess();
            }

            // Handle payment failure
            if (event.data && event.data.type === 'payment_failure') {
                console.log('❌ Payment failure message received from iframe');
                this.handlePaymentFailure();
            }

            // Handle iframe URL changes
            if (event.data && event.data.type === 'iframe_url_change') {
                console.log('🔄 Iframe URL changed:', event.data.url);
                this.handleIframeUrlChange(event.data.url);
            }
        });
    }

    /**
     * Start polling for iframe URL changes
     */
    startIframePolling() {
        if (this.iframePollingInterval) {
            clearInterval(this.iframePollingInterval);
        }

        this.iframePollingInterval = setInterval(() => {
            this.checkIframeUrl();
        }, 1000); // Check every second
    }

    /**
     * Stop polling for iframe URL changes
     */
    stopIframePolling() {
        if (this.iframePollingInterval) {
            clearInterval(this.iframePollingInterval);
            this.iframePollingInterval = null;
        }
    }

    /**
     * Check iframe URL for success/failure indicators
     */
    checkIframeUrl() {
        const iframe = document.querySelector('iframe[src*="gocardless"]');
        if (!iframe) {
            this.stopIframePolling();
            return;
        }

        try {
            // Try to access iframe URL (may fail due to cross-origin)
            const iframeUrl = iframe.contentWindow.location.href;
            this.handleIframeUrlChange(iframeUrl);
        } catch (e) {
            // Cross-origin restrictions - try alternative methods
            console.log('Cannot access iframe URL due to cross-origin restrictions');
            
            // Check if we can detect success/failure through other means
            this.checkIframeContent();
        }
    }

    /**
     * Check iframe content for success/failure indicators
     */
    checkIframeContent() { 
        const iframe = document.querySelector('iframe[src*="gocardless"]');
        if (!iframe) return;

        try {
            // Try to access iframe document
            const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
            
            // Look for success indicators in the iframe content
            const successIndicators = [
                'payment successful',
                'payment completed',
                'success',
                'completed',
                'thank you'
            ];

            const failureIndicators = [
                'payment failed',
                'payment cancelled',
                'error',
                'failed',
                'cancelled'
            ];

            const iframeText = iframeDoc.body ? iframeDoc.body.textContent.toLowerCase() : '';
            
            // Check for success indicators
            const hasSuccess = successIndicators.some(indicator => 
                iframeText.includes(indicator)
            );
            
            // Check for failure indicators
            const hasFailure = failureIndicators.some(indicator => 
                iframeText.includes(indicator)
            );

            if (hasSuccess) {
                console.log('🎯 Detected success indicators in iframe content');
                this.handlePaymentSuccess();
            } else if (hasFailure) {
                console.log('💥 Detected failure indicators in iframe content');
                this.handlePaymentFailure();
            }
        } catch (e) {
            // Cross-origin restrictions prevent access
            console.log('Cannot access iframe content due to cross-origin restrictions');
        }
    }

    /**
     * Handle iframe URL changes to detect success/failure redirects
     */
    handleIframeUrlChange(url) { 
        if (url.includes('/billing/success')) {
            console.log('🎯 Detected billing success URL in iframe - letting billing success route handle it');
            // Don't call handlePaymentSuccess here - let the billing success route handle it
            // Just stop polling and close the iframe
            this.stopIframePolling();
            this.showPaymentFrame = false;
            this.paymentUrl = null;
        } else if (url.includes('/billing/failure')) {
            console.log('💥 Detected billing failure URL in iframe');
            this.handlePaymentFailure();
        }
    }

    /**
     * Handle language selection change
     *
     * @param {Event} event
     * @memberof OnboardIndexController
     */
    @action onLanguageChange(event) {
        const selectedLanguageId = event.target.value;
        this.language = selectedLanguageId;
    }
    async getLatestPricingPlan() {
        try {
            const response = await this.fetch.get('onboard/pricing-plans/latest');
            // If your fetch service returns { success, data }
            if (response.success && response.data) {
                return response.data;
            } else {
                throw new Error(response.message || 'Failed to fetch latest pricing plan');
            }
        } catch (error) {
            console.error('Error fetching latest pricing plan:', error);
            // Fallback to default plan ID if API fails
            return { id: 1 };
        }
    }
    /**
     * Load available languages from the API.
     *
     * @return {Promise}
     * @memberof OnboardIndexController
     */
    async loadLanguages() {
        try {
            const response = await fetch(`${ENV.API.host}/api/v1/languages`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
                cache: 'default',
            });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const { data } = await response.json();
            this.languages = data.map((lang) => ({
                id: lang.id,
                name: lang.name,
            }));
            // Set default language if available
            if (this.languages.length > 0) {
                this.language = this.languages[0].id;
            }
        } catch (error) {
            this.notifications.error('Failed to load languages');
            // Fallback to default languages if API fails
            this.languages = [
                { id: 1, name: 'English' },
                { id: 2, name: 'German' },
                { id: 3, name: 'Spanish' },
                { id: 4, name: 'French' },
                { id: 5, name: 'Italian' },
                { id: 6, name: 'Polish' },
                { id: 7, name: 'Vietnamese' },
            ];
            // Set default language
            this.language = 1;
        }
    }
    getSubscriptionDates() {
        const startDate = new Date();
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + 1);

        return {
            start: startDate.toISOString().split('T')[0],
            end: endDate.toISOString().split('T')[0],
        };
    }
    async callSubscriptionAPI(user_uuid, company_uuid, userInput) {
        const latestPlan = await this.getLatestPricingPlan();
        const dates = this.getSubscriptionDates();
        const fullName = userInput.name.split(' ');
        const givenName = fullName[0] || '';
        const familyName = fullName.slice(1).join(' ') || '';

        const payload = {
            plan_pricing_id: latestPlan.id,
            company_uuid: company_uuid,
            user_uuid: user_uuid,
            no_of_web_users: parseInt(userInput.number_of_web_users),
            no_of_app_users: parseInt(userInput.number_of_drivers),
            description: `${userInput.organization_name} fleet management subscription`,
           
            success_url: `${window.location.origin}/billing/success`,
            exit_uri: `${window.location.origin}/billing/failure`,
            customer: {
                given_name: givenName,
                family_name: givenName,
                email: userInput.email,
            },
            convert_to_subscription: true,
            subscription_start_date: dates.start,
            subscription_end_date: dates.end,
        };
        console.log('Payload:', payload);
        try {
            const response = await this.fetch.post('onboard/subscription', payload);
            console.log('Subscription API Response:', response);
            return response;
        } catch (error) {
            console.error('Subscription API Error:', error);
            throw error;
        }
    }
    @action
    closePaymentFrame() {
        this.stopIframePolling();
        this.showPaymentFrame = false;
        this.paymentUrl = null;
    }

    // @action
    // handlePaymentSuccess() {
    //     console.log('🎯 Payment success handler triggered');
    //     this.stopIframePolling();
        
    //     // Show success message and loader
    //     this.notifications.success('Subscription created successfully! Redirecting to verification...');
        
    //     // Get stored account details from the original onboard response
    //     const accountDetails = sessionStorage.getItem('account_details');
    //     console.log('Account details:', accountDetails);

    //     if (accountDetails) {
    //         const parsedDetails = JSON.parse(accountDetails);
    //         console.log('📋 Parsed account details:', parsedDetails);

    //         const { skipVerification, token, session } = parsedDetails;
    //         console.log('🔍 skipVerification:', skipVerification);
    //         console.log('🔍 token:', token ? 'exists' : 'missing');
    //         console.log('🔍 session:', session ? 'exists' : 'missing');

    //         // Show loading state
    //         this.isLoading = true;
            
    //         // Small delay to show the success message
    //         setTimeout(() => {
    //             // Always redirect to verification page after payment success
    //             console.log('🚀 Redirecting to verification page...');
    //             this.router.transitionTo('onboard.verify-email', { queryParams: { hello: session } })
    //             .then(() => {
    //                 this.notifications.success('Payment completed successfully! Please verify your email.');
    //                 this.showPaymentFrame = false;
    //                 this.paymentUrl = null;
    //             })
    //             .catch((error) => {
    //                 console.error('❌ Failed to redirect to verification page:', error);
    //                 this.notifications.error('Redirect failed. Please try again.');
    //                 this.showPaymentFrame = false;
    //                 this.paymentUrl = null;
    //             })
    //             .finally(() => {
    //                 this.isLoading = false;
    //             });
    //         }, 1500); // 1.5 second delay to show success message
    //     } else {
    //         console.warn('⚠️ No account details found in session storage');
    //         this.notifications.error('Session data missing. Please try the onboarding process again.');
    //         this.showPaymentFrame = false;
    //         this.paymentUrl = null;
    //     }
    // }
    @action
    async handlePaymentSuccess() {
        // DISABLED: This method is disabled to prevent conflicts with the billing success route
        // The billing success route should handle all payment success cases
        console.log('🎯 ONBOARD CONTROLLER: Payment success handler DISABLED - letting billing success route handle it');
        this.stopIframePolling();
        this.showPaymentFrame = false;
        this.paymentUrl = null;
        return;
        
        // Original code commented out below
        /*
        console.log('🎯 ONBOARD CONTROLLER: Payment success handler triggered');
        console.log('🎯 ONBOARD CONTROLLER: Current URL:', window.location.href);
        console.log('🎯 ONBOARD CONTROLLER: Session storage keys:', Object.keys(sessionStorage));
        console.log('🎯 ONBOARD CONTROLLER: Account details:', sessionStorage.getItem('account_details'));
        
        this.stopIframePolling();
        
        // Show success message and loader
        this.notifications.success('Payment completed successfully! Processing your subscription...');
        this.isLoading = true;
        
        // Get stored account details from the original onboard response
        const accountDetails = sessionStorage.getItem('account_details');
        console.log('Account details:', accountDetails);

        if (accountDetails) {
            const parsedDetails = JSON.parse(accountDetails);
            console.log('📋 Parsed account details:', parsedDetails);

            const { skipVerification, token, session } = parsedDetails;
            
            try {
                // Extract subscription details from Chargebee iframe
                const subscriptionData = await this.extractSubscriptionDetails();
                
                // Get stored account details for user_uuid and company_uuid
                const accountDetails = sessionStorage.getItem('account_details');
                let userUuid = null;
                let companyUuid = null;
                let sessionToken = null;
                
                if (accountDetails) {
                    try {
                        const parsedDetails = JSON.parse(accountDetails);
                        userUuid = parsedDetails.user_uuid;
                        companyUuid = parsedDetails.company_uuid;
                        sessionToken = parsedDetails.session;
                    } catch (e) {
                        console.error('Failed to parse account details:', e);
                    }
                }
                
                // Call backend to update user with billing information
                const billingUpdateResponse = await this.fetch.post('onboard/billing-success', {
                    session: sessionToken,
                    user_uuid: userUuid,
                    company_uuid: companyUuid,
                    subscription_id: subscriptionData.subscriptionId,
                    customer_id: subscriptionData.customerId,
                    invoice_id: subscriptionData.invoiceId,
                    payment_status: subscriptionData.paymentStatus
                });

                if (billingUpdateResponse.success) {
                    console.log('✅ Billing information updated successfully');
                    
                    // Small delay to show the success message
                    setTimeout(() => {
                        console.log('🚀 Redirecting to verification page...');
                        this.router.transitionTo('onboard.verify-email', { queryParams: { hello: session } })
                        .then(() => {
                            this.notifications.success('Subscription activated! Please verify your email to complete setup.');
                            this.showPaymentFrame = false;
                            this.paymentUrl = null;
                        }) 
                        .catch((error) => {
                            console.error('❌ Failed to redirect to verification page:', error);
                            this.notifications.error('Redirect failed. Please try again.');
                            this.showPaymentFrame = false;
                            this.paymentUrl = null;
                        })
                        .finally(() => {
                            this.isLoading = false;
                        });
                    }, 1500);
                } else {
                    throw new Error('Failed to update billing information');
                }
                
            } catch (error) {
                console.error('❌ Failed to process billing success:', error);
                this.notifications.error('Payment completed but failed to update subscription details. Please contact support.');
                this.showPaymentFrame = false;
                this.paymentUrl = null;
                this.isLoading = false;
            }
        } else {
            console.warn('⚠️ No account details found in session storage');
            this.notifications.error('Session data missing. Please try the onboarding process again.');
            this.showPaymentFrame = false;
            this.paymentUrl = null;
            this.isLoading = false;
        }
        */
    }
    async extractSubscriptionDetails() {
        // Method 1: Try to get from URL parameters if Chargebee redirects with them
        const urlParams = new URLSearchParams(window.location.search);
        let subscriptionId = urlParams.get('sub_id') || urlParams.get('subscription_id');
        let customerId = urlParams.get('id') || urlParams.get('customer_id');
        let invoiceId = urlParams.get('invoice_id');
        let paymentStatus = urlParams.get('state');
        
        // Method 2: Try to extract from iframe if available
        if (!subscriptionId || !customerId) {
            const iframe = document.querySelector('iframe[src*="chargebee"]');
            if (iframe) {
                try {
                    // Try to access iframe URL for parameters
                    const iframeUrl = iframe.contentWindow.location.href;
                    const iframeParams = new URLSearchParams(new URL(iframeUrl).search);
                    subscriptionId = iframeParams.get('sub_id') || iframeParams.get('subscription_id') || subscriptionId;
                    customerId = iframeParams.get('id') || iframeParams.get('customer_id') || customerId;
                    invoiceId = iframeParams.get('invoice_id') || invoiceId;
                    paymentStatus = iframeParams.get('state') || paymentStatus;
                } catch (e) {
                    console.log('Cannot access iframe URL due to cross-origin restrictions');
                }
            }
        }
        
        // Method 3: Try to get from Chargebee postMessage if they send it
        return new Promise((resolve) => {
            // Set up a temporary listener for Chargebee data
            const handleChargebeeData = (event) => {
                if (event.data && event.data.type === 'chargebee_subscription_data') {
                    window.removeEventListener('message', handleChargebeeData);
                    resolve({
                        subscriptionId: event.data.subscription_id,
                        customerId: event.data.customer_id,
                        invoiceId: event.data.invoice_id,
                        paymentStatus: event.data.payment_status
                    });
                }
            };
            
            window.addEventListener('message', handleChargebeeData);
            
            // Fallback: resolve with available data after a short timeout
            setTimeout(() => {
                window.removeEventListener('message', handleChargebeeData);
                resolve({
                    subscriptionId: subscriptionId || 'temp_' + Date.now(),
                    customerId: customerId || 'temp_customer_' + Date.now(),
                    invoiceId: invoiceId || null,
                    paymentStatus: paymentStatus || 'succeeded'
                });
            }, 2000);
        });
    }
    @action
    handlePaymentFailure() {
        this.stopIframePolling();
        this.showPaymentFrame = false;
        this.notifications.error('Payment setup failed. Please try again.');
    }

    @action
    handleIframeLoad() {
        this.isLoading = false;
        console.log('🔄 Payment iframe loaded');
        // Start polling for iframe URL changes
        this.startIframePolling();
        
        // Check if the iframe URL indicates success or failure
        const iframe = document.querySelector('iframe[src*="gocardless"]');
        if (iframe) {
            try {
                const iframeUrl = iframe.contentWindow.location.href;
                this.handleIframeUrlChange(iframeUrl);
            } catch (e) {
                // Cross-origin restrictions might prevent access
                console.log('Cannot access iframe URL due to cross-origin restrictions');
            }
        }
    }

    /**
     * Start the onboard process.
     *
     * @return {Promise}
     * @memberof OnboardIndexController
     */
    @action async startOnboard(event) {
        event.preventDefault();

        // eslint-disable-next-line ember/no-get
        const validations = OnboardValidations(this.intl);

        const input = getProperties(this, 'name', 'email', 'phone', 'organization_name', 'password', 'password_confirmation', 'language', 'number_of_drivers', 'number_of_web_users');
        const changeset = new Changeset(input, lookupValidator(validations), validations);

        await changeset.validate();
        if (changeset.get('isInvalid')) {
            // Check if any required field is empty
            const requiredFields = ['name', 'email', 'phone', 'organization_name', 'password', 'password_confirmation', 'language','number_of_drivers', 'number_of_web_users'];
            const hasEmptyRequired = requiredFields.some((field) => !this[field] || this[field].toString().trim() === '');
            if (hasEmptyRequired) {
                showErrorOnce(this, this.notifications, this.intl.t('validation.form_invalid'));
                return;
            }
            // Otherwise, show the exact error
            const errorMessage = changeset.errors.firstObject?.validation?.firstObject || 'Please fix the errors in the form.';
            this.notifications.error(errorMessage);
            return;
        } else {
            // Set user timezone
            input.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            // Rename language to language_id for API
            input.language_id = input.language;
            delete input.language;

            this.isLoading = true;

            return this.fetch
                .post('onboard/create-account', input)
                .then(async ({ status, skipVerification, token, session, user_uuid, company_uuid }) => {
                    if (status === 'success') {
                        const accountDetails = {
                            skipVerification,
                            token,
                            session,
                            user_uuid,
                            company_uuid
                        };
                        sessionStorage.setItem('account_details', JSON.stringify(accountDetails));
                        
                        // Also store in localStorage as backup for server environments
                        try {
                            localStorage.setItem('account_details', JSON.stringify(accountDetails));
                            console.log('📋 Account details stored in both sessionStorage and localStorage');
                        } catch (e) {
                            console.warn('⚠️ Failed to store in localStorage:', e);
                        }
                        try {
                            // console.log('Account created successfully, now creating subscription...', user_uuid, company_uuid);
                            // const subscriptionResponse = await this.callSubscriptionAPI(user_uuid, company_uuid, input);
                            this.notifications.success('Account created! Redirecting to payment setup...');
                            
                            // Construct payment URL with user data
                            const baseUrl = ENV.chargebee.baseUrl;
                            const params = new URLSearchParams({
                                'subscription_items[item_price_id][0]': ENV.chargebee.itemPriceIds.basic,
                                'subscription_items[quantity][0]': '1',
                                'subscription_items[item_price_id][1]': ENV.chargebee.itemPriceIds.appUser,
                                'subscription_items[quantity][1]': input.number_of_drivers?.toString() || '1',
                                'subscription_items[item_price_id][2]': ENV.chargebee.itemPriceIds.webUser,
                                'subscription_items[quantity][2]': input.number_of_web_users?.toString() || '1',
                                'layout': 'in_app',
                                'embed': 'true',
                                'customer[email]': input.email,
                                'customer[first_name]': input.name?.split(' ')[0] || '',
                                'customer[last_name]': input.name?.split(' ').slice(1).join(' ') || '',
                                'company': input.organization_name || '',
                                'redirect_url': `${window.location.origin}/billing/success?user_uuid=${user_uuid}&company_uuid=${company_uuid}&session=${session}`,
                            });
                            
                            this.paymentUrl = `${baseUrl}?${params.toString()}`;
                            
                            console.log('🔗 Generated payment URL:', this.paymentUrl);
                            console.log('🔗 Redirect URL:', `${window.location.origin}/billing/success`);
                            console.log('🔗 Current origin:', window.location.origin);
                            
                            this.showPaymentFrame = true;
                            return;
                            // if (subscriptionResponse.success && subscriptionResponse.redirect_url) {
                            //     // Show success message and redirect to payment
                            //     this.notifications.success('Account created! Redirecting to payment setup...');

                            //     // Store subscription details if needed
                            //     const subscriptionDetails = {
                            //         billing_request_id: subscriptionResponse.billing_request_id,
                            //         billing_request_flow_id: subscriptionResponse.billing_request_flow_id,
                            //         subscription_amount: subscriptionResponse.subscription_amount,
                            //         currency: subscriptionResponse.currency,
                            //         billing_cycle: subscriptionResponse.billing_cycle,
                            //         start_date: subscriptionResponse.start_date,
                            //         is_recurring: subscriptionResponse.is_recurring,
                            //     };

                            //     // Store in session or local storage if needed
                            //     sessionStorage.setItem('subscription_details', JSON.stringify(subscriptionDetails));

                            //     // Redirect to GoCardless payment flow
                            //     // setTimeout(() => {
                            //     //     window.location.href = subscriptionResponse.redirect_url;
                            //     // }, 1500);

                            //     // return;
                            //     console.log('Loading payment frame with URL:', subscriptionResponse.redirect_url);

                            //     // Show payment iframe instead of redirecting
                            //     this.paymentUrl = subscriptionResponse.redirect_url;
                            //     this.showPaymentFrame = true;
                            //     console.log('Payment frame shown', this.showPaymentFrame, this.paymentUrl);
                            //     return;
                            // } else {
                            //     throw new Error('Subscription creation failed - no redirect URL received');
                            // }
                        } catch (subscriptionError) {
                            console.error('Subscription creation failed:', subscriptionError);
                            this.notifications.error('Account created but subscription setup failed. Please contact support.');

                            // Still continue with normal flow since account was created
                            // if (skipVerification === true && token) {
                            //     this.session.isOnboarding().manuallyAuthenticate(token);
                            //     return this.router.transitionTo('console').then(() => {
                            //         this.notifications.warning('Welcome to FleetYes! Please complete your subscription setup.');
                            //     });
                            // }

                            // return this.router.transitionTo('onboard.verify-email', { queryParams: { hello: session } });
                        }
                        // if (skipVerification === true && token) {
                        //     // only manually authenticate if skip verification
                        //     this.session.isOnboarding().manuallyAuthenticate(token);

                        //     return this.router.transitionTo('console').then(() => {
                        //         this.notifications.success('Welcome to FleetYes!');
                        //     });
                        // }

                        // return this.router.transitionTo('onboard.verify-email', { queryParams: { hello: session } });
                    }
                })
                .catch((error) => {
                    this.notifications.serverError(error);
                })
                .finally(() => {
                    this.isLoading = false;
                });
        }
    }

    /**
     *
     * @param {*} event
     * Validate Number of driver field
     * @returns
     */
    @action
    validateNumberOfDrivers(event) {
        let value = event.target.value.replace(/[^0-9]/g, '');
        let parsedValue = parseInt(value, 10);
        if (value === '' || parsedValue < 1 || isNaN(parsedValue)) {
            showErrorOnce(this, this.notifications, this.intl.t('common.valid-number-error'));
            this.set('number_of_drivers', null); // Clear the value if invalid
            return;
        }
        this.set('error', null);
        this.set('number_of_drivers', parsedValue);
    }

    /**
     *
     * @param {*} event
     * Validate Number of web users field
     * @returns
     */
    @action
    validateNumberOfWebUsers(event) {
        let value = event.target.value.replace(/[^0-9]/g, '');
        let parsedValue = parseInt(value, 10);
        if (value === '' || parsedValue < 1 || isNaN(parsedValue)) {
            showErrorOnce(this, this.notifications, this.intl.t('common.valid-number-error'));
            this.set('number_of_web_users', null); // Clear the value if invalid
            return;
        }
        this.set('error', null);
        this.set('number_of_web_users', parsedValue);
    }

    /**
     * Clean up when controller is destroyed
     */
    willDestroy() {
        this.stopIframePolling();
        super.willDestroy();
    }
}

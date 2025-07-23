import Controller, { inject as controller } from '@ember/controller';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import pathToRoute from '@fleetbase/ember-core/utils/path-to-route';
import ENV from '@fleetbase/console/config/environment';
import { empty } from '@ember/object/computed';

export default class AuthLoginController extends Controller {
    @controller('auth.forgot-password') forgotPasswordController;
    @service notifications;
    @service urlSearchParams;
    @service session;
    @service router;
    @service intl;
    @service fetch;
    @service currentUser;

    constructor() {
        super(...arguments);
        this.setupIframeMessageListener();
        this.checkForPaymentSuccessMessage();
    }

    /**
     * Check for payment success message in query parameters
     */
    checkForPaymentSuccessMessage() {
        const urlParams = new URLSearchParams(window.location.search);
        const paymentSuccess = urlParams.get('payment_success');
        const message = urlParams.get('message');
        
        if (paymentSuccess === 'true') {
            this.notifications.success(message || 'Payment completed successfully! Please log in to continue.');
        }
    }

    /**
     * Whether or not to remember the users session
     *
     * @var {Boolean}
     */
    @tracked rememberMe = false;

    /**
     * The identity to authenticate with
     *
     * @var {String}
     */
    @tracked identity = null;

    /**
     * The password to authenticate with
     *
     * @var {String}
     */
    @tracked password = null;

    /**
     * Login is validating user input
     *
     * @var {Boolean}
     */
    @tracked isValidating = false;

    /**
     * Login is processing
     *
     * @var {Boolean}
     */
    @tracked isLoading = false;

    /**
     * If the connection or requesst it taking too long
     *
     * @var {Boolean}
     */
    @tracked isSlowConnection = false;

    /**
     * Interval to determine when to timeout the request
     *
     * @var {Integer}
     */
    @tracked timeout = null;

    /**
     * Number of failed login attempts
     *
     * @var {Integer}
     */
    @tracked failedAttempts = 0;

    /**
     * Authentication token.
     *
     * @memberof AuthLoginController
     */
    @tracked token;

    @tracked loaderMessage = '';
    @tracked showPaymentLoginFrame = false;
    @tracked paymentUrl = null;
    @tracked iframePollingInterval = null;
    @tracked isProcessingPaymentSuccess = false;

    /**
     * Action to login user.
     *
     * @param {Event} event
     * @return {void}
     * @memberof AuthLoginController
     */
    @action async login(event) {
        this.loaderMessage = this.intl.t('fleet-ops.common.loading');
        // firefox patch
        event.preventDefault();
        // get user credentials
        const { identity, password, rememberMe } = this;

        // If no identity error
        if (!identity) {
            return this.notifications.warning(this.intl.t('auth.login.no-identity-notification'));
        }

        // If no password error
        if (!password) {
            return this.notifications.warning(this.intl.t('auth.login.no-password-notification'));
        }

        // start loader
        this.isLoading = true;
        // set where to redirect on login
        this.setRedirect();

        // send request to check for 2fa
        try {
            let { twoFaSession, isTwoFaEnabled } = await this.session.checkForTwoFactor(identity);

            if (isTwoFaEnabled) {
                return this.session.store
                    .persist({ identity })
                    .then(() => {
                        return this.router.transitionTo('auth.two-fa', { queryParams: { token: twoFaSession } }).then(() => {
                            this.reset('success');
                        });
                    })
                    .catch((error) => {
                        this.notifications.serverError(error);
                        this.reset('error');

                        throw error;
                    });
            }
        } catch (error) {
            this.isLoading = false;
            return this.notifications.serverError(error);
        }

        try {
            await this.session.authenticate('authenticator:fleetbase', { identity, password }, rememberMe);
        } catch (error) {
            this.failedAttempts++;

            // Handle unverified user
            if (error.toString().includes('not verified')) {
                return this.sendUserForEmailVerification(identity);
            }

            // Handle password reset required
            if (error.toString().includes('reset required')) {
                return this.sendUserForPasswordReset(identity);
            }

            return this.failure(error);
        }

        if (this.session.isAuthenticated) {
            this.success();
        }
    }

    /**
     * Transition user to onboarding screen
     */
    @action transitionToOnboard() {
        return this.router.transitionTo('onboard');
    }

    /**
     * Transition to forgot password screen, if email is set - set it.
     */
    @action forgotPassword() {
        return this.router.transitionTo('auth.forgot-password').then(() => {
            if (this.identity) {
                this.forgotPasswordController.email = this.identity;
            }
        });
    }

    /**
     * Creates an email verification session and transitions user to verification route.
     * First checks subscription status before proceeding with verification.
     *
     * @param {String} email
     * @return {Promise<Transition>}
     * @memberof AuthLoginController
     */
    @action async sendUserForEmailVerification(email) {
        
        try {
            // Get user details from database using email
            const userResponse = await this.fetch.get('users/find-by-email', { email: email });
            
            if (!userResponse || !userResponse.success || !userResponse.data) {
                this.notifications.error('Failed to get user details. Please try again.');
                return this.router.transitionTo('console');
            }
            
            const user = userResponse.data;
            const userId = user.uuid || user.id;
            const companyId = user.company_uuid;
            const chargebeeCustomerId = user.chargebee_customer_id;
            const chargebeeSubscriptionId = user.chargebee_subscription_id; 
            
            // First check subscription status
            // const subscriptionResponse = await this.fetch.get('onboard/subscription/status', { user_id: userId, company_id: companyId });
            
            // if ( subscriptionResponse.data != null) { 
            if(chargebeeSubscriptionId != null) {
                this.isLoading = false;
                // Subscription exists, proceed with verification
                return this.fetch.post('auth/create-verification-session', { email, send: true }).then(({ token, session }) => {
                    return this.session.store.persist({ email }).then(() => {
                        this.notifications.warning(this.intl.t('auth.login.unverified-notification'));
                        return this.router.transitionTo('auth.verification', { queryParams: { token, hello: session } }).then(() => {
                            this.reset('error', false); // Don't clear identity field
                        });
                    });
                });
            } else { 
                
                // Get the latest pricing plan first
                // const latestPlanResponse = await this.fetch.get('onboard/pricing-plans/latest');
                // if (!latestPlanResponse || !latestPlanResponse.success) {
                //     this.notifications.error('Failed to get pricing plan. Please try again.');
                //     return this.router.transitionTo('console');
                // }

                // const latestPlan = latestPlanResponse.data;
                // const dates = this.getSubscriptionDates();
                // const fullName = user.name ? user.name.split(' ') : ['', ''];
                // const givenName = fullName[0] || '';
                // const familyName = fullName.slice(1).join(' ') || fullName[0];

                // const createResponse = await this.fetch.post('onboard/subscription', { 
                //     plan_pricing_id: latestPlan.id,
                //     company_uuid: companyId, 
                //     user_uuid: userId, 
                //     no_of_web_users: user.number_of_web_users || 1,
                //     no_of_app_users: user.number_of_drivers || 0,
                //     description: `${user.company_name || 'Company'} fleet management subscription`,
                //     success_url: `${window.location.origin}/billing/success`,
                //     exit_uri: `${window.location.origin}/billing/failure`,
                //     customer: {
                //         given_name: givenName,
                //         family_name: familyName,
                //         email: email,
                //     },
                //     convert_to_subscription: true,
                //     subscription_start_date: dates.start,
                //     subscription_end_date: dates.end,
                // });
                
                
                // if (createResponse && createResponse.success) {
                //     // Check if payment URL is provided in response
                //     const paymentUrl = createResponse.redirect_url;
                //     if (paymentUrl) {
                //         this.paymentUrl = paymentUrl;
                //         this.showPaymentLoginFrame = true;
                //         this.startIframePolling();
                //         this.notifications.success('Please complete payment setup.');
                //         this.isLoading = false;
                //         return;
                //     }
                    
                //     // If no payment URL, construct one with user data
                //     const baseUrl = "https://agilecyber-test.chargebee.com/hosted_pages/checkout";
                //     const params = new URLSearchParams({
                //         'subscription_items[item_price_id][0]': 'Premium-1-EUR-Monthly',
                //         'subscription_items[quantity][0]': '1',
                //         'subscription_items[item_price_id][1]': 'no_of_drivers-EUR-Monthly',
                //         'subscription_items[quantity][1]': (user.number_of_drivers || 1).toString(),
                //         'subscription_items[item_price_id][2]': 'users-EUR-Monthly',
                //         'subscription_items[quantity][2]': (user.number_of_web_users || 1).toString(),
                //         'layout': 'in_app',
                //         'embed': 'true',
                //         'customer[email]': email,
                //         'customer[first_name]': givenName,
                //         'customer[last_name]': familyName,
                //         'company': user.company_name || ''
                //     });
                    
                //     this.paymentUrl = `${baseUrl}?${params.toString()}`;
                //     this.showPaymentLoginFrame = true;
                //     this.startIframePolling();
                //     this.notifications.success('Please complete payment setup.');
                //     this.isLoading = false;
                //     return;
                    
                //     // If no payment URL, proceed with verification flow
                //     return this.proceedWithVerification(email, createResponse || {});
                // } else {
                //     // Handle subscription creation failure
                //     this.notifications.error('Failed to create subscription. Please contact support.');
                //     return this.router.transitionTo('console');
                // }
                const baseUrl = ENV.chargebee.baseUrl;
                const params = new URLSearchParams({
                    'subscription_items[item_price_id][0]': ENV.chargebee.itemPriceIds.basic,
                    'subscription_items[quantity][0]': '1',
                    'subscription_items[item_price_id][1]': ENV.chargebee.itemPriceIds.appUser,
                    'subscription_items[quantity][1]': user.number_of_drivers?.toString() || '1',
                    'subscription_items[item_price_id][2]': ENV.chargebee.itemPriceIds.webUser,
                    'subscription_items[quantity][2]': user.number_of_web_users?.toString() || '1',
                    'layout': 'in_app',
                    'embed': 'true',
                    'customer[email]': user.email,
                    'customer[first_name]': user.name?.split(' ')[0] || '',
                    'customer[last_name]': user.name?.split(' ').slice(1).join(' ') || '',
                    'company': user.company_name || '',
                    'redirect_url': `${window.location.origin}/billing/success?user_uuid=${user.uuid}&company_uuid=${user.company_uuid}`,
                });
                
                this.paymentUrl = `${baseUrl}?${params.toString()}`;
                
                console.log('🔗 Generated payment URL:', this.paymentUrl);
                // console.log('🔗 Redirect URL:', `${window.location.origin}/billing/success`);
                // console.log('🔗 Current origin:', window.location.origin);
                this.showPaymentLoginFrame = true;
                this.startIframePolling();
                this.showPaymentLoginFrame = true;
                this.notifications.success('Please complete payment setup.');
                    this.isLoading = false;
                return;
            }
        } catch (error) {
            console.log("error",error)
            // If API fails, fallback to default verification behavior
            return this.fetch.post('auth/create-verification-session', { email, send: true }).then(({ token, session }) => {
                return this.session.store.persist({ email }).then(() => {
                    this.notifications.warning(this.intl.t('auth.login.unverified-notification'));
                    return this.router.transitionTo('auth.verification', { queryParams: { token, hello: session } }).then(() => {
                        this.reset('error', false); // Don't clear identity field
                    });
                });
            });
        }
    }
    // @action sendUserForEmailVerification(email) {
    //     return this.fetch.post('auth/create-verification-session', { email, send: true }).then(({ token, session }) => {
    //         return this.session.store.persist({ email }).then(() => {
    //             this.notifications.warning(this.intl.t('auth.login.unverified-notification'));
    //             return this.router.transitionTo('auth.verification', { queryParams: { token, hello: session } }).then(() => {
    //                 this.reset('error', false); // Don't clear identity field
    //             });
    //         });
    //     });
    // }
    /**
     * Sends user to forgot password flow.
     *
     * @param {String} email
     * @return {Promise<Transition>}
     * @memberof AuthLoginController
     */
    @action sendUserForPasswordReset(email) {
        this.notifications.warning(this.intl.t('auth.login.password-reset-required'));
        return this.router.transitionTo('auth.forgot-password', { queryParams: { email } }).then(() => {
            this.reset('error', false); // Don't clear identity field
        });
    }

    /**
     * Sets correct route to send user to after login.
     *
     * @void
     */
    setRedirect() {
        const shift = this.urlSearchParams.get('shift');

        if (shift) {
            this.session.setRedirect(pathToRoute(shift));
        }
    }

    /**
     * Handles the authentication success
     *
     * @void
     */
    async success() {
        this.reset('success');
        // Wait for current user to load
        await this.currentUser.load();
        // Use the aliases from currentUser service
        const email = this.currentUser.email;
        const userId = this.currentUser.id;
        const companyId = this.currentUser.companyId;
        console.log("this.currentUser",this.currentUser.number_of_drivers)
        // const chargebeeCustomerId = this.currentUser.chargebee_customer_id;
        // const chargebeeSubscriptionId = this.currentUser.chargebee_subscription_id; 

        // First check if subscription is created
        try {
            const subscriptionResponse = await this.fetch.get('onboard/subscription/status', { user_id: userId, company_id: companyId });
            
            // if (subscriptionResponse.success && subscriptionResponse.data != null) {
            if(this.currentUser.chargebee_subscription_id != null) {
                // Subscription exists, check if verification is pending
                const subscription = subscriptionResponse.data;
                // Check if verification is pending
                // if (subscription.verification_pending || !user.email_verified_at) {
                if (!this.currentUser.email_verified_at) { 
                    // Verification is pending, redirect to verification page
                    return this.sendUserForEmailVerification(email);
                }
                
                return this.router.transitionTo('console');
            } else {
               
                // Get the latest pricing plan first
                // const latestPlanResponse = await this.fetch.get('onboard/pricing-plans/latest');
                // if (!latestPlanResponse || !latestPlanResponse.success) {
                //     this.notifications.error('Failed to get pricing plan. Please try again.');
                //     return this.router.transitionTo('console');
                // }

                // const latestPlan = latestPlanResponse.data;
                // const dates = this.getSubscriptionDates();
                // const fullName = user.name ? user.name.split(' ') : ['', ''];
                // const givenName = fullName[0] || '';
                // const familyName = fullName.slice(1).join(' ') || '';

                // const createResponse = await this.fetch.post('onboard/subscription', { 
                //     plan_pricing_id: latestPlan.id,
                //     company_uuid: companyId, 
                //     user_uuid: userId, 
                //     no_of_web_users: user.number_of_web_users || 1,
                //     no_of_app_users: user.number_of_drivers || 0,
                //     description: `${user.company_name || 'Company'} fleet management subscription`,
                //     success_url: `${window.location.origin}/billing/success`,
                //     exit_uri: `${window.location.origin}/billing/failure`,
                //     customer: {
                //         given_name: givenName,
                //         family_name: familyName,
                //         email: email,
                //     },
                //     convert_to_subscription: true,
                //     subscription_start_date: dates.start,
                //     subscription_end_date: dates.end,
                // });
                
                
                // if (createResponse && createResponse.success) {
                //     // Check if payment URL is provided in response
                //     const paymentUrl = createResponse.redirect_url || createResponse.data?.redirect_url;
                //     if (paymentUrl) {
                //         this.paymentUrl = paymentUrl;
                //         this.showPaymentLoginFrame = true;
                //         this.startIframePolling();
                //         this.notifications.success('Subscription created! Please complete payment setup.');
                //         return;
                //     }
                if (this.currentUser.email_verified_at == null || empty(this.currentUser.email_verified_at)) {   
                    // If no payment URL, construct one with user data
                    const baseUrl = ENV.chargebee.baseUrl;
                    const params = new URLSearchParams({
                        'subscription_items[item_price_id][0]': ENV.chargebee.itemPriceIds.basic,
                        'subscription_items[quantity][0]': '1',
                        'subscription_items[item_price_id][1]': ENV.chargebee.itemPriceIds.appUser,
                        'subscription_items[quantity][1]': this.currentUser.number_of_drivers?.toString() || '1',
                        'subscription_items[item_price_id][2]': ENV.chargebee.itemPriceIds.webUser,
                        'subscription_items[quantity][2]': this.currentUser.number_of_web_users?.toString() || '1',
                        'layout': 'in_app',
                        'embed': 'true',
                        'customer[email]': this.currentUser.email,
                        'customer[first_name]': this.currentUser.name?.split(' ')[0] || '',
                        'customer[last_name]': this.currentUser.name?.split(' ').slice(1).join(' ') || '',
                        'company': this.currentUser.company_name || '',
                        'redirect_url': `${window.location.origin}/billing/success?user_uuid=${this.currentUser.uuid}&company_uuid=${this.currentUser.company_uuid}`,
                    });
                
                    this.paymentUrl = `${baseUrl}?${params.toString()}`;
                    this.showPaymentLoginFrame = true;
                    this.startIframePolling();  
                    this.notifications.success('Subscription created! Please complete payment setup.');
                    // return;
                    return this.proceedWithVerification(email, createResponse || {});
                }
                else{
                    return this.router.transitionTo('console.fleet-ops');
                }
                    // If no payment URL, proceed with verification flow
                    // return this.proceedWithVerification(email, createResponse || {});
                // } else {
                //     // Handle subscription creation failure
                //     this.notifications.error('Failed to create subscription. Please contact support.');
                //     return this.router.transitionTo('console');
                // }
            }
        } catch (error) {
            // If API fails, fallback to default behavior
            // this.notifications.warning('Unable to verify subscription status. Proceeding to app...');
            return this.router.transitionTo('console.fleet-ops');
        }
    }

    /**
     * Handles the authentication failure
     *
     * @param {String} error An error message
     * @void
     */
    failure(error) {
        this.notifications.serverError(error);
        this.reset('error');
    }

    /**
     * Handles the request slow connection
     *
     * @void
     */
    slowConnection() {
        this.notifications.error(this.intl.t('auth.login.slow-connection-message'));
    }

    /**
     * Get subscription start and end dates
     *
     * @return {Object}
     */
    getSubscriptionDates() {
        const startDate = new Date();
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + 1);

        return {
            start: startDate.toISOString().split('T')[0],
            end: endDate.toISOString().split('T')[0],
        };
    }

    /**
     * Handle iframe message events from payment provider
     *
     * @param {MessageEvent} event
     */
    handleIframeMessage(event) {
        // Handle payment completion
        if (event.data && event.data.type === 'payment_completed') {
            this.handlePaymentSuccess();
        }
        
        // Handle payment failure
        if (event.data && event.data.type === 'payment_failed') {
            this.closePaymentFrame();
            this.notifications.error('Payment failed. Please try again.');
        }
        
        // Handle payment cancellation
        if (event.data && event.data.type === 'payment_cancelled') {
            this.closePaymentFrame();
            this.notifications.warning('Payment was cancelled.');
        }
    }

    /**
     * Handle payment success - redirect to verification page
     */
    @action async handlePaymentSuccess() {
        // Keep payment frame visible but show processing overlay
        this.isProcessingPaymentSuccess = true;
        this.loaderMessage = 'Payment successful! Setting up verification...';

        // Don't close the payment frame yet - keep it visible with overlay
        this.stopIframePolling(); // Stop polling to prevent multiple calls

        // Since user is already authenticated, use current user data
        const email = this.currentUser.email || this.identity;
        const userId = this.currentUser.id;
        const companyId = this.currentUser.companyId;

        try {
            // Create verification session for the authenticated user
            const verificationResponse = await this.fetch.post('auth/create-verification-session', {
                email,
                send: true
            });

            if (verificationResponse && verificationResponse.token && verificationResponse.session) {
                // Store email in session
                await this.session.store.persist({ email });

                this.notifications.success('Payment completed successfully! Please verify your email.');

                // Update loader message before redirect
                this.loaderMessage = 'Redirecting to verification...';

                // Small delay to ensure the message is visible
                await new Promise(resolve => setTimeout(resolve, 1500));

                // Redirect directly to verification page
                return this.router.transitionTo('auth.verification', {
                    queryParams: {
                        token: verificationResponse.token,
                        hello: verificationResponse.session
                    }
                }).then(() => {
                    // Only close the payment frame after successful transition
                    this.closePaymentFrame();
                }).catch((error) => {
                    this.closePaymentFrame();
                });
            } else {
                throw new Error('Invalid verification session response');
            }
        } catch (error) {
            // Reset processing state
            this.isProcessingPaymentSuccess = false;

            // Fallback: check if user needs verification at all
            try {
                const userResponse = await this.fetch.get('users/find-by-email', { email: email });

                if (userResponse && userResponse.success && userResponse.data) {
                    const user = userResponse.data;

                    // If already verified, go to console
                    if (user.email_verified_at) {
                        this.notifications.success('Payment completed successfully!');
                        this.closePaymentFrame();
                        return this.router.transitionTo('console');
                    }
                }
            } catch (fallbackError) {
                console.error('Fallback verification check failed:', fallbackError);
            }

            // Last resort
            this.closePaymentFrame();
            this.notifications.error('Payment completed but verification setup failed. Please contact support.');
            return this.router.transitionTo('console');
        }
    }
    

    /**
     * Check if verification is needed after payment completion
     */
    async checkVerificationAfterPayment() {
        try {
            const email = this.currentUser.email || this.identity;
            const userId = this.currentUser.id;
            const companyId = this.currentUser.companyId;

            // Get user details to check verification status
            const userResponse = await this.fetch.get('users/find-by-email', { email: email });
            
            if (userResponse && userResponse.success && userResponse.data) {
                const user = userResponse.data;
                
                // Check if user needs verification
                if (!user.email_verified_at) {
                    return this.proceedWithVerification(email, { verification_pending: true });
                } else {
                    return this.router.transitionTo('console');
                }
            } else {
                return this.router.transitionTo('console');
            }
        } catch (error) {
            this.notifications.warning('Payment completed. Please verify your email if needed.');
            return this.router.transitionTo('console');
        }
    }

    /**
     * Proceed with verification flow
     *
     * @param {String} email
     * @param {Object} subscriptionData
     */
    async proceedWithVerification(email, subscriptionData) {
        // Check if verification is pending from subscription data
        if (subscriptionData && subscriptionData.verification_pending) {
            return this.router.transitionTo('auth.verification', { 
                queryParams: { 
                    token: subscriptionData.token, 
                    hello: subscriptionData.session 
                } 
            });
        }
        
        // Create verification session
        return this.fetch.post('auth/create-verification-session', { email, send: true }).then(({ token, session }) => {
            return this.session.store.persist({ email }).then(() => {
                this.notifications.warning(this.intl.t('auth.login.unverified-notification'));
                return this.router.transitionTo('auth.verification', { queryParams: { token, hello: session } }).then(() => {
                    this.reset('error', false); // Don't clear identity field
                });
            });
        });
    }

    /**
     * Close the payment frame
     */
    @action closePaymentFrame() {
        this.showPaymentLoginFrame = false;
        this.paymentUrl = null;
        this.isProcessingPaymentSuccess = false; // Reset processing state
        this.loaderMessage = '';
        this.stopIframePolling();
    }

    /**
     * Start polling iframe for URL changes
     */
    startIframePolling() {
        this.stopIframePolling(); // Clear any existing interval
        
        this.iframePollingInterval = setInterval(() => {
            const iframe = document.querySelector('iframe[src*="gocardless"]');
            if (iframe && iframe.contentWindow) {
                try {
                    const currentUrl = iframe.contentWindow.location.href;
                    this.handleIframeUrlChange(currentUrl);
                } catch (e) {
                    // Cross-origin restrictions, ignore
                }
            }
        }, 1000); // Check every second
    }

    /**
     * Stop polling iframe
     */
    stopIframePolling() {
        if (this.iframePollingInterval) {
            clearInterval(this.iframePollingInterval);
            this.iframePollingInterval = null;
        }
    }

    /**
     * Handle iframe URL changes to detect success/failure redirects
     */
    handleIframeUrlChange(url) {
        if (url.includes('/billing/success')) {
            this.handlePaymentSuccess();
        } else if (url.includes('/billing/failure')) {
            this.handlePaymentFailure();
        }
    }

    /**
     * Handle payment failure
     */
    @action handlePaymentFailure() {
        this.stopIframePolling();
        this.closePaymentFrame();
        this.notifications.error('Payment failed. Please try again.');
    }

    /**
     * Setup iframe message listener
     */
    setupIframeMessageListener() {
        window.addEventListener('message', this.handleIframeMessage.bind(this));
    }

    /**
     * Reset the login form
     *
     * @param {String} type
     * @param {Boolean} clearIdentity - Whether to clear the identity field
     * @void
     */
    reset(type, clearIdentity = true) {
        // reset login form state
        this.isLoading = false;
        this.isSlowConnection = false;
        
        // reset login form state depending on type of reset
        switch (type) {
            case 'success':
                if (clearIdentity) {
                    this.identity = null;
                }
                this.password = null;
                this.isValidating = false;
                break;
            case 'error':
            case 'fail':
                this.password = null;
                break;
        }
        // clearTimeout(this.timeout);
    }
}
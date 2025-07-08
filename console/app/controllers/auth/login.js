import Controller, { inject as controller } from '@ember/controller';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import pathToRoute from '@fleetbase/ember-core/utils/path-to-route';

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
    @tracked showPaymentFrame = false;
    @tracked paymentUrl = null;
    @tracked iframePollingInterval = null;

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
        console.log('sendUserForEmailVerification called with email:', email);
        
        try {
            // Get user details from database using email
            console.log("Getting user details for email:", email);
            const userResponse = await this.fetch.get('users/find-by-email', { email: email });
            console.log("User response:", userResponse);
            
            if (!userResponse || !userResponse.success || !userResponse.data) {
                console.error('Failed to get user details by email');
                this.notifications.error('Failed to get user details. Please try again.');
                return this.router.transitionTo('console');
            }
            
            const user = userResponse.data;
            const userId = user.uuid || user.id;
            const companyId = user.company_uuid;
            
            // First check subscription status
            const subscriptionResponse = await this.fetch.get('onboard/subscription/status', { user_id: userId, company_id: companyId });
            
            if (subscriptionResponse.success && subscriptionResponse.data) {
                this.isLoading = false;
                // Subscription exists, proceed with verification
                console.log('Subscription exists, proceeding with email verification');
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
                const latestPlanResponse = await this.fetch.get('onboard/pricing-plans/latest');
                if (!latestPlanResponse || !latestPlanResponse.success) {
                    console.error('Failed to get latest pricing plan');
                    this.notifications.error('Failed to get pricing plan. Please try again.');
                    return this.router.transitionTo('console');
                }

                const latestPlan = latestPlanResponse.data;
                const dates = this.getSubscriptionDates();
                const fullName = user.name ? user.name.split(' ') : ['', ''];
                const givenName = fullName[0] || '';
                const familyName = fullName.slice(1).join(' ') || fullName[0];

                const createResponse = await this.fetch.post('onboard/subscription', { 
                    plan_pricing_id: latestPlan.id,
                    company_uuid: companyId, 
                    user_uuid: userId, 
                    no_of_web_users: user.number_of_web_users || 1,
                    no_of_app_users: user.number_of_drivers || 0,
                    description: `${user.company_name || 'Company'} fleet management subscription`,
                    success_url: `${window.location.origin}/billing/success`,
                    exit_uri: `${window.location.origin}/billing/failure`,
                    customer: {
                        given_name: givenName,
                        family_name: familyName,
                        email: email,
                    },
                    convert_to_subscription: true,
                    subscription_start_date: dates.start,
                    subscription_end_date: dates.end,
                });
                
                
                if (createResponse && createResponse.success) {
                    // Check if payment URL is provided in response
                    const paymentUrl = createResponse.redirect_url;
                    if (paymentUrl) {
                        console.log('Payment URL received, showing payment frame');
                        this.paymentUrl = paymentUrl;
                        this.showPaymentFrame = true;
                        this.startIframePolling();
                        this.notifications.success('Please complete payment setup.');
                        this.isLoading = false;
                        return;
                    }
                    
                    // If no payment URL, proceed with verification flow
                    console.log('No payment URL, proceeding with verification flow');
                    return this.proceedWithVerification(email, createResponse || {});
                } else {
                    // Handle subscription creation failure
                    this.notifications.error('Failed to create subscription. Please contact support.');
                    return this.router.transitionTo('console');
                }
            }
        } catch (error) {
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
        console.log("success");
        this.reset('success');
        // Wait for current user to load
        await this.currentUser.load();
        console.log("currentUser.user in success:", this.currentUser.user);
        console.log("currentUser.id in success:", this.currentUser.id);
        console.log("currentUser.companyId in success:", this.currentUser.companyId);
        console.log("currentUser.email in success:", this.currentUser.email);
        
        // Use the aliases from currentUser service
        const email = this.currentUser.email;
        const userId = this.currentUser.id;
        const companyId = this.currentUser.companyId;

        // First check if subscription is created
        try {
            console.log('Checking subscription status for user:', userId, 'company:', companyId);
            const subscriptionResponse = await this.fetch.get('onboard/subscription/status', { user_id: userId, company_id: companyId });
            
            if (subscriptionResponse.success && subscriptionResponse.data) {
                // Subscription exists, check if verification is pending
                const subscription = subscriptionResponse.data;
                console.log('Subscription found:', subscription);
                
                // Check if verification is pending
                if (subscription.verification_pending || !user.email_verified_at) {
                    console.log('Verification pending, redirecting to verification page');
                    // Verification is pending, redirect to verification page
                    return this.sendUserForEmailVerification(email);
                }
                
                // Subscription exists and is active, proceed to app
                console.log('Subscription active, proceeding to console');
                return this.router.transitionTo('console');
            } else {
                // No subscription found, create one
                console.log('No subscription found, creating new subscription');
                
                // Get the latest pricing plan first
                const latestPlanResponse = await this.fetch.get('onboard/pricing-plans/latest');
                if (!latestPlanResponse || !latestPlanResponse.success) {
                    console.error('Failed to get latest pricing plan');
                    this.notifications.error('Failed to get pricing plan. Please try again.');
                    return this.router.transitionTo('console');
                }

                const latestPlan = latestPlanResponse.data;
                const dates = this.getSubscriptionDates();
                const fullName = user.name ? user.name.split(' ') : ['', ''];
                const givenName = fullName[0] || '';
                const familyName = fullName.slice(1).join(' ') || '';

                const createResponse = await this.fetch.post('onboard/subscription', { 
                    plan_pricing_id: latestPlan.id,
                    company_uuid: companyId, 
                    user_uuid: userId, 
                    no_of_web_users: user.number_of_web_users || 1,
                    no_of_app_users: user.number_of_drivers || 0,
                    description: `${user.company_name || 'Company'} fleet management subscription`,
                    success_url: `${window.location.origin}/billing/success`,
                    exit_uri: `${window.location.origin}/billing/failure`,
                    customer: {
                        given_name: givenName,
                        family_name: familyName,
                        email: email,
                    },
                    convert_to_subscription: true,
                    subscription_start_date: dates.start,
                    subscription_end_date: dates.end,
                });
                
                console.log('Create subscription response in success method:', createResponse);
                
                if (createResponse && createResponse.success) {
                    console.log('Subscription created successfully:', createResponse);
                    
                    // Check if payment URL is provided in response
                    const paymentUrl = createResponse.redirect_url || createResponse.data?.redirect_url;
                    if (paymentUrl) {
                        console.log('Payment URL received, showing payment frame');
                        this.paymentUrl = paymentUrl;
                        this.showPaymentFrame = true;
                        this.startIframePolling();
                        this.notifications.success('Subscription created! Please complete payment setup.');
                        return;
                    }
                    
                    // If no payment URL, proceed with verification flow
                    console.log('No payment URL, proceeding with verification flow');
                    return this.proceedWithVerification(email, createResponse || {});
                } else {
                    // Handle subscription creation failure
                    console.error('Failed to create subscription:', createResponse);
                    this.notifications.error('Failed to create subscription. Please contact support.');
                    return this.router.transitionTo('console');
                }
            }
        } catch (error) {
            // If API fails, fallback to default behavior
            console.error('Subscription check failed:', error);
            this.notifications.warning('Unable to verify subscription status. Proceeding to app...');
            return this.router.transitionTo('console');
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
        console.log('Iframe message received:', event.data);
        
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
    @action handlePaymentSuccess() {
        console.log('🎯 Payment success handler triggered');
        this.closePaymentFrame();
        
        const email = this.currentUser.email || this.identity;
        
        // Always redirect to verification page after payment success
        console.log('🚀 Redirecting to verification page after payment success...');
        
        // Create verification session and redirect
        return this.fetch.post('auth/create-verification-session', { email, send: true }).then(({ token, session }) => {
            return this.session.store.persist({ email }).then(() => {
                this.notifications.success('Payment completed successfully! Please verify your email.');
                return this.router.transitionTo('auth.verification', { queryParams: { token, hello: session } }).then(() => {
                    this.reset('error', false); // Don't clear identity field
                });
            });
        }).catch((error) => {
            console.error('❌ Failed to redirect to verification page:', error);
            this.notifications.error('Payment completed but verification setup failed. Please contact support.');
            return this.router.transitionTo('console');
        });
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
                    console.log('User needs verification after payment, redirecting to verification page');
                    return this.proceedWithVerification(email, { verification_pending: true });
                } else {
                    console.log('User already verified, proceeding to console');
                    return this.router.transitionTo('console');
                }
            } else {
                console.log('Could not get user details, proceeding to console');
                return this.router.transitionTo('console');
            }
        } catch (error) {
            console.error('Error checking verification after payment:', error);
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
            console.log('Verification pending from subscription data, redirecting to verification page');
            return this.router.transitionTo('auth.verification', { 
                queryParams: { 
                    token: subscriptionData.token, 
                    hello: subscriptionData.session 
                } 
            });
        }
        
        // Create verification session
        console.log('Creating verification session for email:', email);
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
        this.showPaymentFrame = false;
        this.paymentUrl = null;
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
            console.log('🎯 Detected billing success URL in iframe');
            this.handlePaymentSuccess();
        } else if (url.includes('/billing/failure')) {
            console.log('💥 Detected billing failure URL in iframe');
            this.handlePaymentFailure();
        }
    }

    /**
     * Handle payment failure
     */
    @action handlePaymentFailure() {
        console.log('💥 Payment failure handler triggered');
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
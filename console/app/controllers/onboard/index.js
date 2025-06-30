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

    constructor() {
        super(...arguments);
        this.loadLanguages();
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
        const dates = this.getSubscriptionDates();
        const fullName = userInput.name.split(' ');
        const givenName = fullName[0] || '';
        const familyName = fullName.slice(1).join(' ') || '';

        const payload = {
            plan_pricing_id: 1,
            company_uuid: company_uuid,
            user_uuid: user_uuid,
            no_of_web_users: parseInt(userInput.number_of_web_users),
            no_of_app_users: parseInt(userInput.number_of_drivers),
            description: `${userInput.organization_name} fleet management subscription`,
            // success_url: 'http://127.0.0.1:8000/int/v1/onboard/billing/success',
            // exit_uri: 'http://127.0.0.1:8000/int/v1/onboard/checkout/failure',
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
        this.showPaymentFrame = false;
        this.paymentUrl = null;
    }

    @action
    handlePaymentSuccess() {
        this.showPaymentFrame = false;
        this.paymentUrl = null;

        // Get stored account details from the original onboard response
        const accountDetails = sessionStorage.getItem('account_details');
        console.log('Account details:', accountDetails);

        if (accountDetails) {
            const parsedDetails = JSON.parse(accountDetails);
            console.log('📋 Parsed account details:', parsedDetails);

            const { skipVerification, token, session } = parsedDetails;
            console.log('🔍 skipVerification:', skipVerification);
            console.log('🔍 token:', token ? 'exists' : 'missing');
            console.log('🔍 session:', session ? 'exists' : 'missing');

            // Always redirect to verification page after payment success
            console.log('🚀 Redirecting to verification page...');
            return this.router.transitionTo('onboard.verify-email', {
                queryParams: { hello: session }
            }).then(() => {
                console.log('✅ Successfully redirected to verification page');
                this.notifications.success('Payment setup completed! Please verify your email to continue.');
            }).catch((error) => {
                console.error('❌ Failed to redirect to verification page:', error);
                this.notifications.error('Redirect failed. Please try again.');
            });
        } else {
            console.warn('⚠️ No account details found in session storage');
            this.notifications.error('Session data missing. Please try the onboarding process again.');
        }
        this.notifications.success('Payment setup completed successfully!');
        // this.router.transitionTo('console');
    }

    @action
    handlePaymentFailure() {
        this.showPaymentFrame = false;
        this.notifications.error('Payment setup failed. Please try again.');
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
        const input = getProperties(this, 'name', 'email', 'phone', 'organization_name', 'password', 'password_confirmation', 'language', 'number_of_drivers', 'number_of_web_users');
        const changeset = new Changeset(input, lookupValidator(OnboardValidations), OnboardValidations);

        await changeset.validate();
        if (changeset.get('isInvalid')) {
            // Check if any required field is empty
            const requiredFields = ['name', 'email', 'phone', 'organization_name', 'password', 'password_confirmation', 'language'];
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
                        try {
                            console.log('Account created successfully, now creating subscription...', user_uuid, company_uuid);
                            const subscriptionResponse = await this.callSubscriptionAPI(user_uuid, company_uuid, input);

                            if (subscriptionResponse.success && subscriptionResponse.redirect_url) {
                                // Show success message and redirect to payment
                                this.notifications.success('Account created! Redirecting to payment setup...');

                                // Store subscription details if needed
                                const subscriptionDetails = {
                                    billing_request_id: subscriptionResponse.billing_request_id,
                                    billing_request_flow_id: subscriptionResponse.billing_request_flow_id,
                                    subscription_amount: subscriptionResponse.subscription_amount,
                                    currency: subscriptionResponse.currency,
                                    billing_cycle: subscriptionResponse.billing_cycle,
                                    start_date: subscriptionResponse.start_date,
                                    is_recurring: subscriptionResponse.is_recurring,
                                };

                                // Store in session or local storage if needed
                                sessionStorage.setItem('subscription_details', JSON.stringify(subscriptionDetails));

                                // Redirect to GoCardless payment flow
                                // setTimeout(() => {
                                //     window.location.href = subscriptionResponse.redirect_url;
                                // }, 1500);

                                // return;
                                console.log('Loading payment frame with URL:', subscriptionResponse.redirect_url);

                                // Show payment iframe instead of redirecting
                                this.paymentUrl = subscriptionResponse.redirect_url;
                                this.showPaymentFrame = true;
                                console.log('Payment frame shown', this.showPaymentFrame, this.paymentUrl);
                                return;
                            } else {
                                throw new Error('Subscription creation failed - no redirect URL received');
                            }
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
            return;
        }
        this.set('error', null);
        this.set('number_of_web_users', parsedValue);
    }
}

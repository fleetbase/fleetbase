import Controller from '@ember/controller';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action, getProperties } from '@ember/object';
import OnboardValidations from '../../validations/onboard';
import lookupValidator from 'ember-changeset-validations';
import Changeset from 'ember-changeset';
import ENV from '@fleetbase/console/config/environment';
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
                    'Content-Type': 'application/json'
                },
                cache: 'default'
            });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const { data } = await response.json();
            this.languages = data.map(lang => ({
                id: lang.id,
                name: lang.name
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
                { id: 7, name: 'Vietnamese' }
            ];
            // Set default language
            this.language = 1;
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
        const input = getProperties(this, 'name', 'email', 'phone', 'organization_name', 'password', 'password_confirmation', 'language', 'number_of_drivers', 'number_of_web_users');
        const changeset = new Changeset(input, lookupValidator(OnboardValidations), OnboardValidations);

        await changeset.validate();

        if (changeset.get('isInvalid')) {
            const errorMessage = changeset.errors.firstObject.validation.firstObject;

            this.notifications.error(errorMessage);
            return;
        }

        // Set user timezone
        input.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        // Rename language to language_id for API
        input.language_id = input.language;
        delete input.language;

        this.isLoading = true;

        return this.fetch
            .post('onboard/create-account', input)
            .then(({ status, skipVerification, token, session }) => {
                if (status === 'success') {
                    if (skipVerification === true && token) {
                        // only manually authenticate if skip verification
                        this.session.isOnboarding().manuallyAuthenticate(token);

                        return this.router.transitionTo('console').then(() => {
                            this.notifications.success('Welcome to FleetYes!');
                        });
                    }

                    return this.router.transitionTo('onboard.verify-email', { queryParams: { hello: session } });
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

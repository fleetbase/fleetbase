import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { getProperties } from '@ember/object';
import { isBlank } from '@ember/utils';
import { task } from 'ember-concurrency';
import { onboardValidationsFor } from '../../validations/onboard';
import lookupValidator from 'ember-changeset-validations';
import Changeset from 'ember-changeset';

export default class OnboardingFormComponent extends Component {
    @service fetch;
    @service session;
    @service router;
    @service notifications;
    @service urlSearchParams;
    @service oauth;
    @tracked name;
    @tracked email;
    @tracked phone;
    @tracked organization_name;
    @tracked password;
    @tracked password_confirmation;
    @tracked error;

    constructor() {
        super(...arguments);

        // A signup that began with "Continue with <provider>" arrives here carrying a
        // registration intent the API issued after verifying the identity. Prefill what
        // the provider told us and drop the password fields — the intent is the
        // credential. Everything else is still collected exactly as before.
        const registration = this.oauth.registration;

        if (registration?.intent) {
            this.oauthIntent = registration.intent;
            this.name = registration.prefill?.name ?? null;
            this.email = registration.prefill?.email ?? null;
        }
    }

    /**
     * The registration intent, when this signup started from a provider.
     *
     * @var {String|null}
     */
    @tracked oauthIntent = null;

    get hasOauthIntent() {
        return !isBlank(this.oauthIntent);
    }

    /**
     * The email came from the provider and the API will verify the intent against it,
     * so editing it here would only produce a mismatch the server rejects.
     */
    get isEmailLocked() {
        return this.hasOauthIntent && !isBlank(this.email);
    }

    get requiredFields() {
        return this.hasOauthIntent ? ['name', 'email', 'phone', 'organization_name'] : ['name', 'email', 'phone', 'organization_name', 'password', 'password_confirmation'];
    }

    get filled() {
        // eslint-disable-next-line ember/no-get
        const input = getProperties(this, ...this.requiredFields);
        return Object.values(input).every((val) => !isBlank(val));
    }

    @task *onboard(event) {
        event?.preventDefault?.();

        // eslint-disable-next-line ember/no-get
        const input = getProperties(this, ...this.requiredFields);
        const validations = onboardValidationsFor({ hasOauthIntent: this.hasOauthIntent });
        const changeset = new Changeset(input, lookupValidator(validations), validations);

        yield changeset.validate();

        if (changeset.get('isInvalid')) {
            const errorMessage = changeset.errors.firstObject.validation.firstObject;

            this.notifications.error(errorMessage);
            return;
        }

        // Set user timezone
        input.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

        if (this.hasOauthIntent) {
            input.oauth_intent = this.oauthIntent;
        }

        try {
            const { status, skipVerification, token, session } = yield this.fetch.post('onboard/create-account', input);
            if (status !== 'success') {
                this.notifications.error('Onboard failed');
                return;
            }

            // Single use: whether or not the rest of the wizard completes, this intent
            // is now spent server side and must not be replayed.
            this.oauth.clearRegistration();

            // save session
            this.args.context.persist('session', session);

            if (skipVerification === true && token) {
                // only manually authenticate if skip verification
                this.session.isOnboarding().manuallyAuthenticate(token);

                yield this.router.transitionTo('console');
                return this.notifications.success('Welcome to Fleetbase!');
            } else {
                this.args.orchestrator.next();
                this.urlSearchParams.setParamsToCurrentUrl({
                    step: this.args.orchestrator?.current?.id,
                    session,
                });
            }
        } catch (err) {
            this.notifications.serverError(err);
        }
    }
}

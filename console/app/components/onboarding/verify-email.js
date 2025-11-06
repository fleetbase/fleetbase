import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { later, next } from '@ember/runloop';
import { not } from '@ember/object/computed';
import { task } from 'ember-concurrency';

export default class OnboardingVerifyEmailComponent extends Component {
    @service('session') authSession;
    @service('user-verification') verification;
    @service fetch;
    @service notifications;
    @service router;
    @service urlSearchParams;
    @tracked code;
    @tracked session;
    @tracked initialized = false;

    constructor() {
        super(...arguments);
        next(() => this.#initialize());
    }

    #initialize() {
        this.code = this.urlSearchParams.get('code');
        this.session = this.args.context.get('session') ?? this.urlSearchParams.get('session');
        this.initialized = true;
        this.verification.start();
    }

    @task *verify(event) {
        event?.preventDefault?.();

        try {
            const { status, token } = yield this.fetch.post('onboard/verify-email', { session: this.session, code: this.code });
            if (status === 'ok') {
                this.notifications.success('Email successfully verified!');

                if (token) {
                    this.notifications.info('Welcome to Fleetbase!');
                    this.authSession.manuallyAuthenticate(token);

                    return this.router.transitionTo('console');
                }

                return this.router.transitionTo('auth.login');
            }
        } catch (error) {
            this.notifications.serverError(error);
        }
    }
}

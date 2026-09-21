import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { task } from 'ember-concurrency';

/**
 * Providers linked to the signed-in user, with link and unlink.
 *
 * Renders nothing when there is nothing to show — no provider linked and none
 * enabled — so an install that has not turned OAuth on sees the account page exactly
 * as before.
 */
export default class AccountConnectedAccountsComponent extends Component {
    @service oauth;
    @service notifications;
    @service intl;
    @service modalsManager;

    @tracked identities = [];
    @tracked available = [];
    @tracked hasPassword = true;
    @tracked isLoaded = false;

    constructor() {
        super(...arguments);
        this.load.perform();
    }

    get isVisible() {
        return this.isLoaded && (this.identities.length > 0 || this.available.length > 0);
    }

    /**
     * Whether removing this identity would leave the account with no way to sign in.
     * The API refuses it regardless; this only lets the button say so up front.
     */
    @action isLastCredential(identity) {
        return !this.hasPassword && this.identities.length === 1 && this.identities[0]?.provider === identity?.provider;
    }

    @action apply(payload = {}) {
        this.identities = Array.isArray(payload.identities) ? payload.identities : [];
        this.available = Array.isArray(payload.available) ? payload.available : [];
        this.hasPassword = payload.has_password !== false;
        this.isLoaded = true;
    }

    @task *load() {
        try {
            this.apply(yield this.oauth.loadIdentities());
        } catch (error) {
            // Not fatal: the rest of the account page still works without this panel.
            this.isLoaded = true;
        }
    }

    @task *link(provider) {
        try {
            yield this.oauth.startLink(provider.id);
        } catch (error) {
            this.notifications.error(this.intl.t(this.messageFor(error)));
        }
    }

    @task *unlink(identity) {
        try {
            this.apply(yield this.oauth.unlink(identity.provider));
            this.notifications.success(this.intl.t('auth.login.oauth.unlinked', { provider: identity.label }));
        } catch (error) {
            this.notifications.error(this.intl.t(this.messageFor(error)));
        }
    }

    @action confirmUnlink(identity) {
        this.modalsManager.confirm({
            title: this.intl.t('auth.login.oauth.unlink-title', { provider: identity.label }),
            body: this.intl.t('auth.login.oauth.unlink-body', { provider: identity.label }),
            acceptButtonText: this.intl.t('auth.login.oauth.unlink-button'),
            acceptButtonScheme: 'danger',
            confirm: async (modal) => {
                modal.startLoading();
                await this.unlink.perform(identity);
                modal.done();
            },
        });
    }

    messageFor(error) {
        const code = error?.code ?? error?.payload?.code;

        return (
            {
                last_credential: 'auth.login.oauth.errors.last-credential',
                already_linked: 'auth.login.oauth.errors.already-linked',
                provider_disabled: 'auth.login.oauth.errors.provider-disabled',
                rate_limited: 'auth.login.oauth.errors.rate-limited',
            }[code] ?? 'auth.login.oauth.errors.generic'
        );
    }
}

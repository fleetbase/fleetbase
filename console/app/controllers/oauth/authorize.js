import Controller from '@ember/controller';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { task } from 'ember-concurrency';

/**
 * Errors the API returns for a request that can't be shown, mapped to copy. The console never
 * renders the server's own text here.
 */
const ERROR_KEYS = {
    invalid_client: 'oauth.authorize.errors.invalid-client',
    invalid_request: 'oauth.authorize.errors.invalid-request',
    invalid_scope: 'oauth.authorize.errors.invalid-scope',
    unsupported_response_type: 'oauth.authorize.errors.invalid-request',
    access_denied: 'oauth.authorize.errors.no-organization',
    interaction_required: 'oauth.authorize.errors.invalid-request',
};

export default class OauthAuthorizeController extends Controller {
    @service fetch;
    @service session;
    @service intl;
    @service oauthAuthorization;

    @tracked params = null;
    @tracked details = null;
    @tracked error = null;
    @tracked selectedOrganization = null;

    get organizations() {
        return this.details?.organizations ?? [];
    }

    get shareableOrganizations() {
        return this.organizations.filter((organization) => organization.can_share);
    }

    get organization() {
        return this.organizations.find((organization) => organization.id === this.selectedOrganization) ?? null;
    }

    /**
     * Each scope in plain words, naming the organization picked.
     */
    get scopeLines() {
        const name = this.organization?.name ?? this.intl.t('oauth.authorize.your-organization');

        return (this.details?.scopes ?? []).map((scope) => ({
            ...scope,
            text: String(scope.description ?? scope.scope).replace('{organization}', name),
        }));
    }

    get canApprove() {
        if (!this.details || this.approve.isRunning || this.deny.isRunning) {
            return false;
        }

        return !this.details.requires_organization || !!this.organization?.can_share;
    }

    @action showError(code) {
        this.details = null;
        this.error = this.intl.t(ERROR_KEYS[code] ?? 'oauth.authorize.errors.generic');
    }

    @action selectOrganization(event) {
        this.selectedOrganization = event?.target?.value ?? event;
    }

    @task *load(params) {
        this.params = params;
        this.error = null;

        let details;
        try {
            details = yield this.fetch.get('oauth-server/authorization', params, { rawError: true });
        } catch (response) {
            return this.handleError(response);
        }

        if (details.reauthenticate) {
            return this.reauthenticate();
        }

        this.details = details;
        this.selectedOrganization = details.selected_organization ?? this.shareableOrganizations[0]?.id ?? null;

        if (details.skip_consent) {
            yield this.approve.perform();
        }
    }

    @task *approve() {
        let response;
        try {
            response = yield this.fetch.post('oauth-server/authorization', { ...this.params, organization: this.selectedOrganization }, { rawError: true });
        } catch (error) {
            if (error?.reauthenticate) {
                return this.reauthenticate();
            }

            return this.handleError(error);
        }

        this.oauthAuthorization.leaveTo(response.redirect);
    }

    @task *deny() {
        let response;
        try {
            response = yield this.fetch.delete('oauth-server/authorization', this.params, { rawError: true });
        } catch (error) {
            return this.handleError(error);
        }

        this.oauthAuthorization.leaveTo(response.redirect);
    }

    /**
     * Sign out and back in. The request stays saved, so the console brings the user back here.
     */
    @action reauthenticate() {
        this.oauthAuthorization.save(this.params);

        return this.session.invalidateWithLoader(this.intl.t('oauth.authorize.reauthenticate'));
    }

    @action switchAccount() {
        return this.reauthenticate();
    }

    /**
     * An error the app can be told about goes back to it; any other is shown here.
     */
    handleError(response) {
        if (response?.redirect) {
            return this.oauthAuthorization.leaveTo(response.redirect);
        }

        this.oauthAuthorization.clear();
        this.showError(response?.error);
    }
}

import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { task } from 'ember-concurrency';

const EMPTY_FORM = () => ({
    name: '',
    description: '',
    redirect_uris: '',
    allowed_scopes: [],
    logo_url: '',
    website_url: '',
    privacy_url: '',
    terms_url: '',
    official: false,
    development: false,
    confidential: true,
});

/**
 * Admin → Auth Config → OAuth Apps: apps that offer "Continue with Fleetbase".
 *
 * A client secret is shown once, right after the app is registered or its secret rotated;
 * the API stores only a hash and can't show it again.
 */
export default class ConfigureOauthAppsComponent extends Component {
    @service fetch;
    @service notifications;
    @service modalsManager;

    @tracked apps = [];
    @tracked scopes = [];
    @tracked form = null;
    @tracked editing = null;
    @tracked revealedSecret = null;
    @tracked grantsFor = null;
    @tracked grants = [];
    @tracked isUploadingLogo = false;

    constructor() {
        super(...arguments);
        this.load.perform();
    }

    @task *load() {
        try {
            const payload = yield this.fetch.get('oauth-server/apps');
            this.apps = payload.apps ?? [];
            this.scopes = payload.scopes ?? [];
        } catch (error) {
            this.notifications.serverError(error);
        }
    }

    @action startCreate() {
        this.editing = null;
        this.revealedSecret = null;
        this.form = EMPTY_FORM();
    }

    @action startEdit(app) {
        this.editing = app;
        this.revealedSecret = null;
        this.form = {
            ...EMPTY_FORM(),
            ...app,
            redirect_uris: (app.redirect_uris ?? []).join('\n'),
            allowed_scopes: [...(app.allowed_scopes ?? [])],
        };
    }

    @action cancelForm() {
        this.form = null;
        this.editing = null;
    }

    @action setField(key, eventOrValue) {
        const value = eventOrValue?.target ? eventOrValue.target.value : eventOrValue;
        this.form = { ...this.form, [key]: value };
    }

    /**
     * Upload the logo the way Admin → Branding does, and keep its URL: the consent screen and
     * Connected apps show it to people outside this organization, so it must be publicly readable.
     */
    @action uploadLogo(file) {
        this.isUploadingLogo = true;

        return this.fetch.uploadFile.perform(
            file,
            { path: 'uploads/system/oauth-apps', type: 'system' },
            (uploadedFile) => {
                this.form = { ...this.form, logo_url: uploadedFile.url };
                this.isUploadingLogo = false;
            },
            (error) => {
                this.isUploadingLogo = false;
                this.notifications.serverError(error);
            }
        );
    }

    @action removeLogo() {
        this.form = { ...this.form, logo_url: '' };
    }

    @action toggleScope(scope) {
        const scopes = this.form.allowed_scopes.includes(scope) ? this.form.allowed_scopes.filter((item) => item !== scope) : [...this.form.allowed_scopes, scope];
        this.form = { ...this.form, allowed_scopes: scopes };
    }

    @action hasScope(scope) {
        return this.form?.allowed_scopes?.includes(scope) ?? false;
    }

    serialize() {
        const blankToNull = (value) => (typeof value === 'string' && value.trim() === '' ? null : value);

        return {
            name: this.form.name,
            description: blankToNull(this.form.description),
            redirect_uris: String(this.form.redirect_uris ?? '')
                .split(/\s+/)
                .map((uri) => uri.trim())
                .filter(Boolean),
            allowed_scopes: this.form.allowed_scopes,
            logo_url: blankToNull(this.form.logo_url),
            website_url: blankToNull(this.form.website_url),
            privacy_url: blankToNull(this.form.privacy_url),
            terms_url: blankToNull(this.form.terms_url),
            official: !!this.form.official,
            development: !!this.form.development,
            confidential: !!this.form.confidential,
        };
    }

    @task *save() {
        try {
            if (this.editing) {
                yield this.fetch.put(`oauth-server/apps/${this.editing.id}`, this.serialize());
                this.notifications.success('App updated.');
            } else {
                const payload = yield this.fetch.post('oauth-server/apps', this.serialize());
                this.revealedSecret = { app: payload.app, secret: payload.client_secret };
                this.notifications.success('App registered.');
            }
            this.form = null;
            this.editing = null;
            yield this.load.perform();
        } catch (error) {
            this.notifications.serverError(error);
        }
    }

    @action confirmRotate(app) {
        this.modalsManager.confirm({
            title: `Rotate the secret for ${app.name}?`,
            body: 'The current secret stops working immediately. The app cannot get new tokens until it is updated with the new secret.',
            acceptButtonText: 'Rotate secret',
            acceptButtonScheme: 'danger',
            confirm: async (modal) => {
                modal.startLoading();
                try {
                    const payload = await this.fetch.post(`oauth-server/apps/${app.id}/rotate-secret`);
                    this.revealedSecret = { app: payload.app, secret: payload.client_secret };
                } catch (error) {
                    this.notifications.serverError(error);
                }
                modal.done();
            },
        });
    }

    @action confirmToggle(app) {
        const disabling = !app.disabled_at;
        this.modalsManager.confirm({
            title: disabling ? `Turn off ${app.name}?` : `Turn ${app.name} back on?`,
            body: disabling
                ? 'Everyone signed in through this app is signed out, and every access it holds is revoked. Turning it back on does not restore them; users authorize it again.'
                : 'People can authorize the app again.',
            acceptButtonText: disabling ? 'Turn off' : 'Turn on',
            acceptButtonScheme: disabling ? 'danger' : 'primary',
            confirm: async (modal) => {
                modal.startLoading();
                try {
                    await this.fetch.post(`oauth-server/apps/${app.id}/${disabling ? 'disable' : 'enable'}`);
                    await this.load.perform();
                } catch (error) {
                    this.notifications.serverError(error);
                }
                modal.done();
            },
        });
    }

    @task *showGrants(app) {
        this.grantsFor = app;
        this.grants = [];
        try {
            const payload = yield this.fetch.get(`oauth-server/apps/${app.id}/grants`);
            this.grants = payload.grants ?? [];
        } catch (error) {
            this.notifications.serverError(error);
        }
    }

    @action hideGrants() {
        this.grantsFor = null;
        this.grants = [];
    }

    @task *revokeGrant(grant) {
        try {
            yield this.fetch.delete(`oauth-server/grants/${grant.id}`);
            this.grants = this.grants.filter((item) => item.id !== grant.id);
            this.notifications.success('Access revoked.');
        } catch (error) {
            this.notifications.serverError(error);
        }
    }

    @action joined(list) {
        return (list ?? []).join(' ');
    }

    @action dismissSecret() {
        this.revealedSecret = null;
    }
}

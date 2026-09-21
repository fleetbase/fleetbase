import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { task } from 'ember-concurrency';

/**
 * Administrator configuration for OAuth sign-in providers.
 *
 * Rendered entirely from the schema the API returns, so a provider added later on
 * the server appears here with no console change.
 *
 * Secrets are never sent to this component — the API returns only whether each one
 * is set and a short masked hint. Secret inputs therefore start empty; leaving one
 * empty on save means "keep the stored value", and typing into it replaces it.
 */
export default class ConfigureOauthComponent extends Component {
    @service fetch;
    @service notifications;

    @tracked enabled = true;
    @tracked allowRegistration = true;

    /**
     * [{ id, label, icon, schema }]
     *
     * @var {Array}
     */
    @tracked providers = [];

    /**
     * Editable values keyed by provider id. Secret fields hold only what the admin has
     * typed this session — never a value read from the server.
     *
     * @var {Object}
     */
    @tracked values = {};

    /**
     * { [providerId]: { [secretField]: { configured, hint } } }
     *
     * @var {Object}
     */
    @tracked secretStatus = {};

    @tracked redirectUris = {};

    @tracked testResults = {};

    constructor() {
        super(...arguments);
        this.load.perform();
    }

    isSecret(definition) {
        return definition?.secret === true;
    }

    // Called from the template as helpers, which Ember invokes unbound — @action binds
    // `this` so they can read component state.
    @action fieldsFor(provider) {
        return Object.entries(provider?.schema ?? {}).map(([key, definition]) => ({
            key,
            label: definition.label ?? key,
            help: definition.help ?? null,
            secret: this.isSecret(definition),
            required: definition.required === true,
            // The Apple .p8 key is multi-line PEM; everything else is a single line.
            multiline: key === 'private_key',
        }));
    }

    @action valueFor(providerId, field) {
        return this.values[providerId]?.[field] ?? '';
    }

    @action secretPlaceholder(providerId, field) {
        const status = this.secretStatus[providerId]?.[field];

        return status?.configured ? `Saved (${status.hint ?? '••••'}) — leave blank to keep` : 'Not set';
    }

    @action isProviderEnabled(providerId) {
        return this.values[providerId]?.enabled === true;
    }

    @action updateField(providerId, field, event) {
        const value = event?.target ? event.target.value : event;

        this.values = {
            ...this.values,
            [providerId]: { ...(this.values[providerId] ?? {}), [field]: value },
        };
    }

    @action toggleProvider(providerId, enabled) {
        this.updateField(providerId, 'enabled', enabled);
    }

    @action applyConfig(payload = {}) {
        const oauth = payload.oauth ?? {};

        this.providers = Array.isArray(payload.providers) ? payload.providers : [];
        this.redirectUris = payload.redirect_uris ?? {};
        this.enabled = oauth.enabled !== false;
        this.allowRegistration = oauth.allow_registration !== false;

        const values = {};
        const secretStatus = {};

        for (const provider of this.providers) {
            const stored = oauth.providers?.[provider.id] ?? {};

            values[provider.id] = { enabled: stored.enabled === true };
            secretStatus[provider.id] = {};

            for (const field of this.fieldsFor(provider)) {
                if (field.secret) {
                    // Start empty: the real value never reaches the browser.
                    values[provider.id][field.key] = '';
                    secretStatus[provider.id][field.key] = stored[field.key] ?? { configured: false, hint: null };
                } else {
                    values[provider.id][field.key] = stored[field.key] ?? '';
                }
            }
        }

        this.values = values;
        this.secretStatus = secretStatus;
    }

    /**
     * The save payload. Secret fields left empty are omitted rather than sent blank,
     * so the stored value is kept.
     */
    serialize() {
        const providers = {};

        for (const provider of this.providers) {
            const current = this.values[provider.id] ?? {};
            const out = { enabled: current.enabled === true };

            for (const field of this.fieldsFor(provider)) {
                const value = current[field.key];

                if (field.secret && (value === undefined || value === null || String(value).trim() === '')) {
                    continue;
                }

                out[field.key] = value ?? '';
            }

            providers[provider.id] = out;
        }

        return {
            enabled: this.enabled,
            allow_registration: this.allowRegistration,
            providers,
        };
    }

    @task *load() {
        try {
            const payload = yield this.fetch.get('settings/oauth-config');
            this.applyConfig(payload);
        } catch (error) {
            this.notifications.serverError(error);
        }
    }

    @task *save() {
        try {
            const payload = yield this.fetch.post('settings/oauth-config', this.serialize());
            this.applyConfig(payload);
            this.testResults = {};
            this.notifications.success('OAuth configuration saved.');
        } catch (error) {
            this.notifications.serverError(error);
        }
    }

    @task *test(providerId) {
        try {
            const result = yield this.fetch.post('settings/test-oauth-config', { provider: providerId });
            this.testResults = { ...this.testResults, [providerId]: result };
        } catch (error) {
            this.notifications.serverError(error);
        }
    }

    @action testMessage(result) {
        if (!result) {
            return null;
        }

        if (result.problem === 'invalid_signing_key') {
            return 'The signing key could not be used to mint a client secret. Check that it is the full .p8 file for this Key ID.';
        }

        if (result.problem === 'missing_credentials') {
            return 'Some required credentials are missing. Fill in every required field and save before testing.';
        }

        if (result.configured && !result.enabled) {
            return 'Credentials look complete. Enable the provider and save to offer it on the sign-in page.';
        }

        return 'Credentials look complete. Register the callback URL below with the provider if you have not already.';
    }
}

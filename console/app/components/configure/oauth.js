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

    /**
     * The last check result per provider. Cleared when that provider's credentials
     * are edited, because it no longer describes what is in the form.
     *
     * @var {Object}
     */
    @tracked testResults = {};

    /**
     * Which providers are live on the server, as of the last load or save. A live
     * provider can always be switched off; switching one on takes a passing check.
     *
     * @var {Object}
     */
    @tracked savedEnabled = {};

    /**
     * Whether each provider's panel starts open. Set once, on load: binding @open to
     * anything that changes as the admin types makes ContentPanel reset its open state
     * on every keystroke.
     *
     * @var {Object}
     */
    @tracked panelOpen = {};

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

    /**
     * Switching a provider off is always allowed. Switching one on needs the provider
     * to have accepted the credentials currently in the form — the server enforces the
     * same rule on save, this just says so before the admin gets that far.
     */
    @action canToggleProvider(providerId) {
        return this.isProviderEnabled(providerId) || this.testResults[providerId]?.verified === true;
    }

    @action toggleHelp(provider) {
        if (this.canToggleProvider(provider.id)) {
            return null;
        }

        return `Run "Check configuration" to confirm ${provider.label} accepts these credentials before offering it.`;
    }

    @action updateField(providerId, field, event) {
        const value = event?.target ? event.target.value : event;

        this.values = {
            ...this.values,
            [providerId]: { ...(this.values[providerId] ?? {}), [field]: value },
        };

        if (field !== 'enabled' && this.testResults[providerId]) {
            const { [providerId]: stale, ...rest } = this.testResults; // eslint-disable-line no-unused-vars
            this.testResults = rest;
        }
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
        this.savedEnabled = Object.fromEntries(this.providers.map((provider) => [provider.id, values[provider.id].enabled]));
    }

    /**
     * One provider's fields as they stand in the form. Secret fields left empty are
     * omitted rather than sent blank, so the stored value is kept.
     */
    serializeProvider(provider) {
        const current = this.values[provider.id] ?? {};
        const out = { enabled: current.enabled === true };

        for (const field of this.fieldsFor(provider)) {
            const value = current[field.key];

            if (field.secret && (value === undefined || value === null || String(value).trim() === '')) {
                continue;
            }

            out[field.key] = value ?? '';
        }

        return out;
    }

    /**
     * The save payload.
     */
    serialize() {
        const providers = {};

        for (const provider of this.providers) {
            providers[provider.id] = this.serializeProvider(provider);
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
            this.panelOpen = { ...this.savedEnabled };
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

    /**
     * Check the credentials currently in the form — saved or not — with the provider.
     */
    @task *test(providerId) {
        const provider = this.providers.find((candidate) => candidate.id === providerId);
        // eslint-disable-next-line no-unused-vars
        const { enabled, ...values } = this.serializeProvider(provider);

        try {
            const result = yield this.fetch.post('settings/test-oauth-config', { provider: providerId, values });
            this.testResults = { ...this.testResults, [providerId]: result };
        } catch (error) {
            this.notifications.serverError(error);
        }
    }
}

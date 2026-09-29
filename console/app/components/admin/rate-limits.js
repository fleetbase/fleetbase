import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { task } from 'ember-concurrency';

/**
 * System-wide API rate limits and per-organization overrides.
 *
 * Limits apply per API consumer (each API key, access token, or anonymous client IP),
 * never platform-wide, so one busy integration is throttled on its own. The environment
 * (THROTTLE_* variables) supplies the defaults; saving here overrides them until reset.
 */
export default class AdminRateLimitsComponent extends Component {
    @service fetch;
    @service notifications;

    @tracked enabled = true;
    @tracked maxAttempts = 120;
    @tracked decayMinutes = 1;
    @tracked trackConsumers = true;
    @tracked overrides = [];
    @tracked defaults = {};
    @tracked unlimitedKeys = 0;
    @tracked companyToAdd = null;

    constructor() {
        super(...arguments);
        this.load.perform();
    }

    get isBusy() {
        return this.load.isRunning || this.save.isRunning || this.reset.isRunning;
    }

    get differsFromDefaults() {
        const defaults = this.defaults ?? {};

        return (
            this.enabled !== defaults.enabled ||
            Number(this.maxAttempts) !== defaults.max_attempts ||
            Number(this.decayMinutes) !== defaults.decay_minutes ||
            this.trackConsumers !== defaults.track_consumers ||
            this.overrides.length > 0
        );
    }

    @task *load() {
        try {
            const response = yield this.fetch.get('rate-limits/settings');
            this.apply(response);
        } catch (error) {
            this.notifications.serverError(error);
        }
    }

    @task *save() {
        try {
            const response = yield this.fetch.post('rate-limits/settings', this.payload());
            this.apply(response);
            this.notifications.success('Rate limit settings saved.');
        } catch (error) {
            this.notifications.serverError(error);
        }
    }

    @task *reset() {
        try {
            const response = yield this.fetch.delete('rate-limits/settings');
            this.apply(response);
            this.notifications.success('Rate limits reset to the environment defaults.');
        } catch (error) {
            this.notifications.serverError(error);
        }
    }

    apply(response = {}) {
        const settings = response.settings ?? {};

        this.enabled = settings.enabled ?? true;
        this.maxAttempts = settings.max_attempts ?? 120;
        this.decayMinutes = settings.decay_minutes ?? 1;
        this.trackConsumers = settings.track_consumers ?? true;
        this.overrides = (settings.overrides ?? []).map((override) => ({ ...override }));
        this.defaults = response.defaults ?? {};
        this.unlimitedKeys = response.unlimited_keys ?? 0;
    }

    payload() {
        return {
            enabled: this.enabled,
            max_attempts: Number(this.maxAttempts),
            decay_minutes: Number(this.decayMinutes),
            track_consumers: this.trackConsumers,
            overrides: this.overrides.map((override) => ({
                company_uuid: override.company_uuid,
                unlimited: Boolean(override.unlimited),
                max_attempts: override.unlimited || override.max_attempts === '' || override.max_attempts === null ? null : Number(override.max_attempts),
                note: override.note ?? '',
            })),
        };
    }

    @action toggleEnabled(enabled) {
        this.enabled = enabled;
    }

    @action toggleTrackConsumers(trackConsumers) {
        this.trackConsumers = trackConsumers;
    }

    @action addOverride(company) {
        const companyUuid = company?.uuid ?? company?.id;
        this.companyToAdd = null;

        if (!companyUuid || this.overrides.some((override) => override.company_uuid === companyUuid)) {
            return;
        }

        this.overrides = [
            ...this.overrides,
            {
                company_uuid: companyUuid,
                company_id: company.public_id,
                company_name: company.name,
                unlimited: false,
                max_attempts: Number(this.maxAttempts) * 2,
                note: '',
            },
        ];
    }

    @action updateOverride(override, key, value) {
        this.overrides = this.overrides.map((existing) => (existing === override ? { ...existing, [key]: value } : existing));
    }

    @action updateOverrideInput(override, key, event) {
        this.updateOverride(override, key, event.target.value);
    }

    @action removeOverride(override) {
        this.overrides = this.overrides.filter((existing) => existing !== override);
    }
}

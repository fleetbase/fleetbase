import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { task } from 'ember-concurrency';

/**
 * One organization override. Edited in place — its fields are tracked — so typing in the
 * table's inputs does not replace the row object and re-render (and blur) the input.
 */
export class RateLimitOverride {
    @tracked unlimited;
    @tracked max_attempts;
    @tracked note;

    constructor({ company_uuid, company_id = null, company_name = null, unlimited = false, max_attempts = null, note = '' }) {
        this.company_uuid = company_uuid;
        this.company_id = company_id;
        this.company_name = company_name;
        this.unlimited = unlimited;
        this.max_attempts = max_attempts;
        this.note = note;
    }

    /** The organization, shaped for the table's identity cell. */
    get organization() {
        return { id: this.company_uuid, uuid: this.company_uuid, public_id: this.company_id, name: this.company_name ?? this.company_uuid };
    }
}

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
    @service router;

    @tracked enabled = true;
    @tracked maxAttempts = 120;
    @tracked decayMinutes = 1;
    @tracked trackConsumers = true;
    @tracked overrides = [];
    @tracked defaults = {};
    @tracked unlimitedKeys = 0;
    @tracked companyToAdd = null;

    overrideColumns = [
        {
            label: 'Organization',
            valuePath: 'organization',
            cellComponent: 'table/cell/identity',
            resourceType: 'company',
            resourcePath: 'organization',
            labelPath: 'name',
            popover: false,
            hideBadges: true,
            onClick: this.openOrganization,
            width: '240px',
            resizable: true,
        },
        { label: 'Unlimited', valuePath: 'unlimited', cellComponent: 'admin/table/cell/override-unlimited', onToggle: this.updateOverride, width: '100px' },
        {
            label: 'Requests / window',
            valuePath: 'max_attempts',
            cellComponent: 'admin/table/cell/override-input',
            inputType: 'number',
            inputKey: 'max_attempts',
            onInput: this.updateOverrideInput,
            width: '150px',
        },
        {
            label: 'Note',
            valuePath: 'note',
            cellComponent: 'admin/table/cell/override-input',
            inputType: 'text',
            inputKey: 'note',
            placeholder: 'Why this override exists',
            onInput: this.updateOverrideInput,
            width: '260px',
            resizable: true,
        },
        {
            label: '',
            cellComponent: 'table/cell/dropdown',
            ddButtonText: false,
            ddButtonIcon: 'ellipsis-h',
            ddButtonIconPrefix: 'fas',
            ddMenuLabel: 'Override Actions',
            cellClassNames: 'overflow-visible',
            wrapperClass: 'flex items-center justify-end mx-2',
            sticky: 'right',
            width: 60,
            actions: [
                { label: 'View organization', icon: 'building', fn: (override) => this.openOrganization(override.organization) },
                { label: 'Remove override', icon: 'trash', fn: (override) => this.removeOverride(override) },
            ],
        },
    ];

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
        this.overrides = (settings.overrides ?? []).map((override) => new RateLimitOverride(override));
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
            new RateLimitOverride({
                company_uuid: companyUuid,
                company_id: company.public_id,
                company_name: company.name,
                max_attempts: Number(this.maxAttempts) * 2,
            }),
        ];
    }

    @action updateOverride(override, key, value) {
        override[key] = value;
    }

    @action updateOverrideInput(override, key, event) {
        this.updateOverride(override, key, event.target.value);
    }

    @action removeOverride(override) {
        this.overrides = this.overrides.filter((existing) => existing !== override);
    }

    @action openOrganization(organization) {
        if (!organization?.public_id) return;
        this.router.transitionTo('console.admin.organizations.details', organization.public_id);
    }
}

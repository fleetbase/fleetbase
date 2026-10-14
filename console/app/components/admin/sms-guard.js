import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { task } from 'ember-concurrency';

/**
 * A comma separated field as a list of trimmed, non-empty entries.
 */
export function toList(value) {
    if (Array.isArray(value)) {
        return value.map((entry) => String(entry).trim()).filter(Boolean);
    }

    return String(value ?? '')
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean);
}

/**
 * A limit field as a number, or null for "no limit" (blank).
 */
export function toLimit(value) {
    if (value === null || value === undefined || value === '') {
        return null;
    }

    return Number(value);
}

/**
 * One organization exception. Edited in place (tracked fields) so typing in the table's
 * inputs does not replace the row object and blur the input.
 */
export class SmsGuardOverride {
    @tracked unlimited;
    @tracked per_day;
    @tracked allowed_countries;
    @tracked note;

    constructor({ company_uuid, company_id = null, company_name = null, unlimited = false, per_day = null, allowed_countries = [], note = '' }) {
        this.company_uuid = company_uuid;
        this.company_id = company_id;
        this.company_name = company_name;
        this.unlimited = unlimited;
        this.per_day = per_day;
        this.allowed_countries = toList(allowed_countries).join(', ');
        this.note = note;
    }

    /** The organization, shaped for the table's identity cell. */
    get organization() {
        return { id: this.company_uuid, uuid: this.company_uuid, public_id: this.company_id, name: this.company_name ?? this.company_uuid };
    }
}

/**
 * The SMS guard: what bounds the text messages the platform sends when a public storefront
 * key or an API credential leaks. Budgets per organization and platform-wide, destination
 * rules, the circuit breaker's thresholds, who is alerted, the pauses in force and what the
 * send ledger shows. Everything here applies within a minute, without a deployment.
 */
export default class AdminSmsGuardComponent extends Component {
    @service fetch;
    @service notifications;
    @service router;

    @tracked enabled = true;
    @tracked mode = 'enforce';
    @tracked companyPerMinute = 10;
    @tracked companyPerHour = 60;
    @tracked companyPerDay = 200;
    @tracked destinationCooldown = 60;
    @tracked destinationPerHour = 3;
    @tracked destinationPerDay = 5;
    @tracked probationDays = 7;
    @tracked probationPerDay = 20;
    @tracked platformPerHour = 1500;
    @tracked platformPerDay = 10000;
    @tracked pauseMinutes = 60;
    @tracked distinctDestinations = 25;
    @tracked newCountryMinSends = 10;
    @tracked conversionMinIssued = 20;
    @tracked conversionMinPercent = 10;
    @tracked alertEmails = '';
    @tracked blockedCountries = '';
    @tracked blockedPrefixes = '';
    @tracked overrides = [];
    @tracked pauses = [];
    @tracked usage = [];
    @tracked usageHours = 24;
    @tracked defaults = {};
    @tracked ledgerAvailable = false;
    @tracked companyToAdd = null;
    @tracked pauseTarget = null;
    @tracked pauseLength = 60;
    @tracked pauseReason = '';

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
            width: '220px',
            resizable: true,
        },
        { label: 'Unlimited', valuePath: 'unlimited', cellComponent: 'admin/table/cell/override-unlimited', onToggle: this.updateOverride, width: '100px' },
        {
            label: 'Messages / day',
            valuePath: 'per_day',
            cellComponent: 'admin/table/cell/override-input',
            inputType: 'number',
            inputKey: 'per_day',
            onInput: this.updateOverrideInput,
            width: '130px',
        },
        {
            label: 'Allowed countries',
            valuePath: 'allowed_countries',
            cellComponent: 'admin/table/cell/override-input',
            inputType: 'text',
            inputKey: 'allowed_countries',
            placeholder: 'Any; or e.g. GB, FR',
            onInput: this.updateOverrideInput,
            width: '160px',
        },
        {
            label: 'Note',
            valuePath: 'note',
            cellComponent: 'admin/table/cell/override-input',
            inputType: 'text',
            inputKey: 'note',
            placeholder: 'Why this exception exists',
            onInput: this.updateOverrideInput,
            width: '220px',
            resizable: true,
        },
        {
            label: '',
            cellComponent: 'table/cell/dropdown',
            ddButtonText: false,
            ddButtonIcon: 'ellipsis-h',
            ddButtonIconPrefix: 'fas',
            ddMenuLabel: 'Exception Actions',
            cellClassNames: 'overflow-visible',
            wrapperClass: 'flex items-center justify-end mx-2',
            sticky: 'right',
            width: 60,
            actions: [
                { label: 'View organization', icon: 'building', fn: (override) => this.openOrganization(override.organization) },
                { label: 'Remove exception', icon: 'trash', fn: (override) => this.removeOverride(override) },
            ],
        },
    ];

    pauseColumns = [
        { label: 'Scope', valuePath: 'label', width: '220px', resizable: true },
        { label: 'Reason', valuePath: 'reason', width: '240px', resizable: true },
        { label: 'Until', valuePath: 'untilLabel', width: '180px' },
        { label: 'Automatic', valuePath: 'autoLabel', width: '100px' },
        {
            label: '',
            cellComponent: 'table/cell/dropdown',
            ddButtonText: false,
            ddButtonIcon: 'ellipsis-h',
            ddButtonIconPrefix: 'fas',
            ddMenuLabel: 'Pause Actions',
            cellClassNames: 'overflow-visible',
            wrapperClass: 'flex items-center justify-end mx-2',
            sticky: 'right',
            width: 60,
            actions: [{ label: 'Lift pause', icon: 'play', fn: (pause) => this.unpause.perform(pause.scope) }],
        },
    ];

    usageColumns = [
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
            width: '220px',
            resizable: true,
        },
        { label: 'Sent', valuePath: 'sent', width: '80px' },
        { label: 'Failed', valuePath: 'failed', width: '80px' },
        { label: 'Blocked', valuePath: 'blocked', width: '90px' },
        { label: 'Numbers', valuePath: 'destinations', width: '90px' },
        { label: 'Daily budget', valuePath: 'budgetLabel', width: '110px' },
        { label: 'Paused', valuePath: 'pausedLabel', width: '80px' },
        { label: 'Last send', valuePath: 'last_send_at', cellComponent: 'admin/table/cell/date-time', width: '170px' },
    ];

    constructor() {
        super(...arguments);
        this.load.perform();
    }

    get isBusy() {
        return this.load.isRunning || this.save.isRunning || this.reset.isRunning || this.pause.isRunning || this.unpause.isRunning;
    }

    get isMonitoring() {
        return this.mode === 'monitor';
    }

    get differsFromDefaults() {
        const defaults = this.defaults ?? {};

        return (
            this.enabled !== defaults.enabled ||
            this.mode !== defaults.mode ||
            Number(this.companyPerDay) !== defaults.companyPerDay ||
            Number(this.companyPerHour) !== defaults.companyPerHour ||
            Number(this.platformPerDay) !== defaults.platformPerDay ||
            Number(this.pauseMinutes) !== defaults.pauseMinutes ||
            this.overrides.length > 0
        );
    }

    @task *load() {
        try {
            const response = yield this.fetch.get('sms-guard/settings');
            this.apply(response);
        } catch (error) {
            this.notifications.serverError(error);
        }

        yield this.loadUsage.perform();
    }

    @task *loadUsage() {
        try {
            const response = yield this.fetch.get('sms-guard/usage', { hours: this.usageHours });
            this.usage = (response?.usage ?? []).map((row) => this.usageRow(row));
            this.ledgerAvailable = response?.ledger_available ?? this.ledgerAvailable;
        } catch (error) {
            this.notifications.serverError(error);
        }
    }

    @task *save() {
        try {
            const response = yield this.fetch.post('sms-guard/settings', this.payload());
            this.apply(response);
            this.notifications.success('SMS guard settings saved.');
        } catch (error) {
            this.notifications.serverError(error);
        }
    }

    @task *reset() {
        try {
            const response = yield this.fetch.delete('sms-guard/settings');
            this.apply(response);
            this.notifications.success('SMS guard reset to the environment defaults.');
        } catch (error) {
            this.notifications.serverError(error);
        }
    }

    @task *pause() {
        const scope = this.pauseTarget?.uuid ?? this.pauseTarget?.id ?? null;
        if (!scope) {
            return;
        }

        try {
            const response = yield this.fetch.post('sms-guard/pauses', {
                scope,
                minutes: toLimit(this.pauseLength),
                reason: this.pauseReason || 'manual',
            });
            this.pauses = this.pauseRows(response?.pauses);
            this.pauseTarget = null;
            this.pauseReason = '';
            this.notifications.success('SMS paused.');
        } catch (error) {
            this.notifications.serverError(error);
        }
    }

    @task *unpause(scope) {
        try {
            const response = yield this.fetch.delete(`sms-guard/pauses/${encodeURIComponent(scope)}`);
            this.pauses = this.pauseRows(response?.pauses);
            this.notifications.success('SMS resumed.');
        } catch (error) {
            this.notifications.serverError(error);
        }
    }

    apply(response = {}) {
        const settings = response.settings ?? {};
        const limits = settings.limits ?? {};
        const breaker = settings.breaker ?? {};
        const validation = settings.validation ?? {};
        const defaults = response.defaults ?? {};

        this.enabled = settings.enabled ?? true;
        this.mode = settings.mode ?? 'enforce';
        this.companyPerMinute = limits.company?.per_minute ?? null;
        this.companyPerHour = limits.company?.per_hour ?? null;
        this.companyPerDay = limits.company?.per_day ?? null;
        this.destinationCooldown = limits.destination?.cooldown_seconds ?? null;
        this.destinationPerHour = limits.destination?.per_hour ?? null;
        this.destinationPerDay = limits.destination?.per_day ?? null;
        this.probationDays = limits.probation?.days ?? 0;
        this.probationPerDay = limits.probation?.per_day ?? null;
        this.platformPerHour = limits.platform?.public?.per_hour ?? null;
        this.platformPerDay = limits.platform?.public?.per_day ?? null;
        this.pauseMinutes = breaker.pause_minutes ?? 60;
        this.distinctDestinations = breaker.distinct_destinations_per_10m ?? null;
        this.newCountryMinSends = breaker.new_country_min_sends ?? null;
        this.conversionMinIssued = breaker.conversion_min_issued ?? null;
        this.conversionMinPercent = breaker.conversion_min_percent ?? 0;
        this.alertEmails = toList(settings.alert_emails).join(', ');
        this.blockedCountries = toList(validation.blocked_countries).join(', ');
        this.blockedPrefixes = toList(validation.blocked_prefixes).join(', ');
        this.overrides = (settings.overrides ?? []).map((override) => new SmsGuardOverride(override));
        this.pauses = this.pauseRows(response.pauses);
        this.ledgerAvailable = response.ledger_available ?? false;
        this.defaults = {
            enabled: defaults.enabled ?? true,
            mode: defaults.mode ?? 'enforce',
            companyPerDay: defaults.limits?.company?.per_day ?? null,
            companyPerHour: defaults.limits?.company?.per_hour ?? null,
            platformPerDay: defaults.limits?.platform?.public?.per_day ?? null,
            pauseMinutes: defaults.breaker?.pause_minutes ?? 60,
        };
    }

    payload() {
        return {
            enabled: this.enabled,
            mode: this.mode,
            alert_emails: toList(this.alertEmails),
            validation: {
                blocked_countries: toList(this.blockedCountries).map((country) => country.toUpperCase()),
                blocked_prefixes: toList(this.blockedPrefixes),
            },
            limits: {
                destination: { cooldown_seconds: toLimit(this.destinationCooldown), per_hour: toLimit(this.destinationPerHour), per_day: toLimit(this.destinationPerDay) },
                company: { per_minute: toLimit(this.companyPerMinute), per_hour: toLimit(this.companyPerHour), per_day: toLimit(this.companyPerDay) },
                probation: { days: toLimit(this.probationDays) ?? 0, per_day: toLimit(this.probationPerDay) },
                platform: { public: { per_hour: toLimit(this.platformPerHour), per_day: toLimit(this.platformPerDay) } },
            },
            breaker: {
                pause_minutes: toLimit(this.pauseMinutes) ?? 60,
                distinct_destinations_per_10m: toLimit(this.distinctDestinations),
                new_country_min_sends: toLimit(this.newCountryMinSends),
                conversion_min_issued: toLimit(this.conversionMinIssued),
                conversion_min_percent: toLimit(this.conversionMinPercent) ?? 0,
            },
            overrides: this.overrides.map((override) => ({
                company_uuid: override.company_uuid,
                unlimited: Boolean(override.unlimited),
                per_day: override.unlimited ? null : toLimit(override.per_day),
                allowed_countries: toList(override.allowed_countries).map((country) => country.toUpperCase()),
                note: override.note ?? '',
            })),
        };
    }

    pauseRows(pauses = []) {
        return (pauses ?? []).map((pause) => ({
            ...pause,
            label: pause.platform ? 'Whole platform' : (pause.company_name ?? pause.scope),
            untilLabel: pause.until_iso ?? 'until lifted by an administrator',
            autoLabel: pause.auto ? 'yes' : 'no',
        }));
    }

    usageRow(row) {
        return {
            ...row,
            organization: { id: row.company_uuid, uuid: row.company_uuid, public_id: row.company_id, name: row.company_name ?? row.company_uuid },
            budgetLabel: row.daily_budget === null || row.daily_budget === undefined ? 'unlimited' : String(row.daily_budget),
            pausedLabel: row.paused ? 'yes' : 'no',
        };
    }

    @action toggleEnabled(enabled) {
        this.enabled = enabled;
    }

    @action changeMode(event) {
        this.mode = event.target.value === 'monitor' ? 'monitor' : 'enforce';
    }

    @action addOverride(company) {
        const companyUuid = company?.uuid ?? company?.id;
        this.companyToAdd = null;

        if (!companyUuid || this.overrides.some((override) => override.company_uuid === companyUuid)) {
            return;
        }

        this.overrides = [
            ...this.overrides,
            new SmsGuardOverride({
                company_uuid: companyUuid,
                company_id: company.public_id,
                company_name: company.name,
                per_day: toLimit(this.companyPerDay) === null ? null : Number(this.companyPerDay) * 2,
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

    @action selectPauseTarget(company) {
        this.pauseTarget = company;
    }

    @action openOrganization(organization) {
        if (!organization?.public_id) return;
        this.router.transitionTo('console.admin.organizations.details', organization.public_id);
    }
}

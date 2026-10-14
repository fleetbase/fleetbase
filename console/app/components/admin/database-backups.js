import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { task } from 'ember-concurrency';

/** How often a backup can be scheduled. */
export const FREQUENCIES = [
    { value: 'hourly', label: 'Every hour' },
    { value: 'every_six_hours', label: 'Every 6 hours' },
    { value: 'every_twelve_hours', label: 'Every 12 hours' },
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
];

/** Days of the week, 0 = Sunday. Values are strings because that is what a <select> reports. */
export const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((label, index) => ({ value: String(index), label }));

const TRIGGERS = { scheduled: 'Scheduled', manual: 'Manual', console: 'Console' };

/** An enabled schedule with no successful backup for this long is flagged. */
export const STALE_AFTER_MS = 26 * 60 * 60 * 1000;

const ERROR_PREVIEW_LENGTH = 80;

// Backup schedules run in UTC, so run times are shown in UTC too.
const DATE_FORMAT = { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC', timeZoneName: 'short' };

/**
 * A byte count as a human readable size, e.g. 1536 => "1.5 KB".
 */
export function formatBytes(bytes) {
    if (bytes === null || bytes === undefined || bytes === '' || Number.isNaN(Number(bytes))) {
        return '—';
    }

    let value = Number(bytes);
    if (value < 1024) {
        return `${value} B`;
    }

    const units = ['KB', 'MB', 'GB', 'TB'];
    let unit = -1;
    while (value >= 1024 && unit < units.length - 1) {
        value /= 1024;
        unit++;
    }

    return `${Math.round(value * 10) / 10} ${units[unit]}`;
}

/**
 * A duration in milliseconds as a short label, e.g. 95000 => "1m 35s".
 */
export function formatDuration(ms) {
    if (ms === null || ms === undefined) {
        return '—';
    }
    if (ms < 1000) {
        return `${ms} ms`;
    }
    if (ms < 60000) {
        return `${Math.round(ms / 100) / 10} s`;
    }

    return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
}

/**
 * A timestamp as a UTC date and time, or null when there is none or it does not parse.
 */
export function formatDateTime(value) {
    if (!value) {
        return null;
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return null;
    }

    return new Intl.DateTimeFormat(undefined, DATE_FORMAT).format(date);
}

/** A blank input means "no limit" (null); anything else is a whole number. */
function nullableInteger(value) {
    if (value === null || value === undefined || String(value).trim() === '') {
        return null;
    }

    return Number(value);
}

/**
 * Scheduled database backups: when they run, where the dumps go, how long they are kept,
 * and who hears about a failure. The environment supplies the defaults; saving here
 * overrides them until reset.
 */
export default class AdminDatabaseBackupsComponent extends Component {
    @service fetch;
    @service notifications;

    @tracked enabled = false;
    @tracked frequency = 'daily';
    @tracked time = '02:00';
    @tracked dayOfWeek = '0';
    @tracked disk = '';
    @tracked bucket = '';
    @tracked path = '';
    @tracked connections = [];
    @tracked retentionDays = '';
    @tracked retentionCount = '';
    @tracked minSizeBytes = 0;
    @tracked notifyOnFailure = false;
    @tracked notifyEmails = '';
    @tracked defaults = {};
    @tracked disks = [];
    @tracked availableConnections = [];
    @tracked lastRun = null;
    @tracked lastSuccess = null;
    @tracked runs = [];

    frequencyOptions = FREQUENCIES;
    dayOptions = DAYS_OF_WEEK;

    runColumns = [
        { label: 'Started', valuePath: 'startedLabel', cellComponent: 'admin/table/cell/date-time', width: '190px', resizable: true },
        { label: 'Database', valuePath: 'databaseLabel', width: '160px', resizable: true },
        { label: 'Trigger', valuePath: 'triggerLabel', width: '100px' },
        { label: 'Status', valuePath: 'status', cellComponent: 'table/cell/status', width: '120px' },
        { label: 'Size', valuePath: 'sizeLabel', width: '100px' },
        { label: 'Duration', valuePath: 'durationLabel', width: '100px' },
        { label: 'Error', valuePath: 'errorPreview', cellComponent: 'admin/table/cell/backup-error', width: '260px', resizable: true },
        { label: 'Pruned', valuePath: 'isPruned', cellComponent: 'admin/table/cell/backup-pruned', width: '90px' },
    ];

    constructor() {
        super(...arguments);
        this.load.perform();
        this.loadRuns.perform();
    }

    get isBusy() {
        return this.load.isRunning || this.save.isRunning || this.reset.isRunning;
    }

    get isWeekly() {
        return this.frequency === 'weekly';
    }

    get isHourly() {
        return this.frequency === 'hourly';
    }

    get selectedDisk() {
        return this.disks.find((disk) => disk.name === this.disk) ?? null;
    }

    /** A bucket override only means something on an S3 disk. */
    get isS3() {
        return this.selectedDisk?.driver === 's3';
    }

    get diskOptions() {
        return this.disks.map((disk) => ({ value: disk.name, label: `${disk.name} (${disk.driver})` }));
    }

    get connectionOptions() {
        return this.availableConnections.map((name) => ({ name, checked: this.connections.includes(name) }));
    }

    get minSizeLabel() {
        return formatBytes(this.minSizeBytes);
    }

    get lastSuccessLabel() {
        return formatDateTime(this.lastSuccess?.completed_at);
    }

    get lastRunLabel() {
        return formatDateTime(this.lastRun?.started_at);
    }

    get lastRunFailed() {
        return this.lastRun?.status === 'failed';
    }

    /** Enabled, but nothing has completed in the last 26 hours (a daily run plus slack). */
    get isStale() {
        if (!this.enabled) {
            return false;
        }

        const completedAt = Date.parse(this.lastSuccess?.completed_at ?? '');

        return Number.isNaN(completedAt) || Date.now() - completedAt > STALE_AFTER_MS;
    }

    get runRows() {
        return this.runs.map((run) => {
            const error = run.error ?? '';

            return {
                ...run,
                startedLabel: formatDateTime(run.started_at),
                databaseLabel: run.database ?? run.connection ?? '—',
                triggerLabel: TRIGGERS[run.trigger] ?? run.trigger ?? '—',
                sizeLabel: formatBytes(run.size_bytes),
                durationLabel: formatDuration(run.duration_ms),
                errorPreview: error.length > ERROR_PREVIEW_LENGTH ? `${error.slice(0, ERROR_PREVIEW_LENGTH)}…` : error || null,
                isPruned: Boolean(run.pruned_at),
                prunedLabel: formatDateTime(run.pruned_at),
            };
        });
    }

    @task *load() {
        try {
            const response = yield this.fetch.get('database-backups/settings');
            this.apply(response);
        } catch (error) {
            this.notifications.serverError(error);
        }
    }

    @task *save() {
        try {
            const response = yield this.fetch.post('database-backups/settings', this.payload());
            this.apply(response);
            this.notifications.success('Database backup settings saved.');
        } catch (error) {
            this.notifications.serverError(error);
        }
    }

    @task *reset() {
        try {
            const response = yield this.fetch.delete('database-backups/settings');
            this.apply(response);
            this.notifications.success('Database backups reset to the environment defaults.');
        } catch (error) {
            this.notifications.serverError(error);
        }
    }

    @task *loadRuns() {
        try {
            const response = yield this.fetch.get('database-backups/runs', { limit: 25 });
            const runs = response?.runs ?? [];
            this.runs = runs;

            // Runs arrive newest first, so they also bring the status summary up to date.
            if (runs.length) {
                this.lastRun = runs[0];
                this.lastSuccess = runs.find((run) => run.status === 'completed') ?? this.lastSuccess;
            }
        } catch (error) {
            this.notifications.serverError(error);
        }
    }

    @task *runNow() {
        try {
            yield this.fetch.post('database-backups/run', {});
            this.notifications.success('Backup queued. It runs in the background; use Refresh to follow its progress.');
        } catch (error) {
            this.notifications.serverError(error);
        }
    }

    apply(response = {}) {
        const settings = response.settings ?? {};

        this.enabled = settings.enabled ?? false;
        this.frequency = settings.frequency ?? 'daily';
        this.time = settings.time ?? '02:00';
        this.dayOfWeek = String(settings.day_of_week ?? 0);
        this.disk = settings.disk ?? '';
        this.bucket = settings.bucket ?? '';
        this.path = settings.path ?? '';
        this.connections = settings.connections ?? [];
        this.retentionDays = settings.retention_days ?? '';
        this.retentionCount = settings.retention_count ?? '';
        this.minSizeBytes = settings.min_size_bytes ?? 0;
        this.notifyOnFailure = settings.notify_on_failure ?? false;
        this.notifyEmails = (settings.notify_emails ?? []).join(', ');
        this.defaults = response.defaults ?? {};
        this.disks = response.disks ?? [];
        this.availableConnections = response.connections ?? [];
        this.lastRun = response.last_run ?? null;
        this.lastSuccess = response.last_success ?? null;
    }

    payload() {
        const bucket = String(this.bucket ?? '').trim();
        const emails = String(this.notifyEmails ?? '').split(',');

        return {
            enabled: this.enabled,
            frequency: this.frequency,
            time: this.time,
            day_of_week: Number(this.dayOfWeek),
            disk: this.disk,
            bucket: this.isS3 && bucket ? bucket : null,
            path: String(this.path ?? '').trim(),
            connections: [...this.connections],
            retention_days: nullableInteger(this.retentionDays),
            retention_count: nullableInteger(this.retentionCount),
            min_size_bytes: Number(this.minSizeBytes) || 0,
            notify_on_failure: this.notifyOnFailure,
            notify_emails: emails.map((email) => email.trim()).filter(Boolean),
        };
    }

    @action toggleEnabled(enabled) {
        this.enabled = enabled;
    }

    @action toggleNotifyOnFailure(notifyOnFailure) {
        this.notifyOnFailure = notifyOnFailure;
    }

    @action setFrequency(frequency) {
        this.frequency = frequency;
    }

    @action setDayOfWeek(dayOfWeek) {
        this.dayOfWeek = dayOfWeek;
    }

    @action setDisk(disk) {
        this.disk = disk;
    }

    @action toggleConnection(name, checked) {
        if (!checked) {
            this.connections = this.connections.filter((connection) => connection !== name);
            return;
        }

        if (!this.connections.includes(name)) {
            this.connections = [...this.connections, name];
        }
    }
}

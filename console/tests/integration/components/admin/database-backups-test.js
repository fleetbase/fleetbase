import { module, test } from 'qunit';
import { setupRenderingTest } from '@fleetbase/console/tests/helpers';
import { render, click, settled } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import Service from '@ember/service';
import { captureComponent } from '@fleetbase/console/tests/helpers/capture-component';
import AdminDatabaseBackupsComponent, { formatBytes, formatDuration, formatDateTime, FREQUENCIES, DAYS_OF_WEEK } from '@fleetbase/console/components/admin/database-backups';

const HOUR = 60 * 60 * 1000;
// Relative to now, so the 26-hour staleness check does not depend on when the suite runs.
const ago = (ms) => new Date(Date.now() - ms).toISOString();
// The component's format, built independently so assertions do not depend on the CI
// browser's locale.
const FORMAT = { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC', timeZoneName: 'short' };
const format = (iso) => new Intl.DateTimeFormat(undefined, FORMAT).format(new Date(iso));

const LONG_ERROR = `mysqldump: Got error: 2013: Lost connection to server during query when dumping table orders at row: 18234 ${'x'.repeat(40)}`;

const SETTINGS = {
    enabled: true,
    frequency: 'daily',
    time: '02:30',
    day_of_week: 1,
    disk: 's3',
    bucket: 'fb-backups',
    path: 'backups/db',
    connections: ['mysql'],
    retention_days: 30,
    retention_count: null,
    min_size_bytes: 1024,
    notify_on_failure: true,
    notify_emails: ['ops@example.com', 'cto@example.com'],
};

function completedRun(overrides = {}) {
    return {
        id: 'run-ok',
        connection: 'mysql',
        database: 'fleetbase',
        status: 'completed',
        trigger: 'scheduled',
        disk: 's3',
        path: 'backups/db/fleetbase.sql.gz',
        size_bytes: 1572864,
        duration_ms: 95000,
        error: null,
        started_at: ago(2 * HOUR),
        completed_at: ago(2 * HOUR - 95000),
        pruned_at: null,
        ...overrides,
    };
}

const FAILED_RUN = {
    id: 'run-failed',
    connection: 'sandbox',
    database: 'fleetbase_sandbox',
    status: 'failed',
    trigger: 'manual',
    disk: 's3',
    path: null,
    size_bytes: null,
    duration_ms: 450,
    error: LONG_ERROR,
    started_at: ago(3 * HOUR),
    completed_at: ago(3 * HOUR),
    pruned_at: null,
};

function settingsResponse(settings = {}, extra = {}) {
    const lastRun = completedRun();

    return {
        settings: { ...SETTINGS, ...settings },
        defaults: { ...SETTINGS, enabled: false },
        disks: [
            { name: 'local', driver: 'local' },
            { name: 's3', driver: 's3' },
        ],
        connections: ['mysql', 'sandbox'],
        last_run: lastRun,
        last_success: lastRun,
        ...extra,
    };
}

/**
 * Lets the task's fetch (a native promise, which settled() does not track) resolve.
 */
function flush() {
    return new Promise((resolve) => setTimeout(resolve, 0));
}

module('Integration | Component | admin/database-backups', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        const context = this;
        this.requests = [];
        this.getResponse = settingsResponse();
        this.writeResponse = settingsResponse({ time: '04:00' });
        this.runsResponse = { runs: [completedRun(), FAILED_RUN, completedRun({ id: 'run-pruned', trigger: 'console', size_bytes: 2048, duration_ms: 4200, pruned_at: ago(HOUR) })] };
        this.fail = {};

        class FetchStub extends Service {
            request(method, path, payload, query) {
                context.requests.push({ method, path, payload, query });
                if (context.fail[method]) {
                    return Promise.reject(new Error(`${method} failed`));
                }
                if (path === 'database-backups/runs') {
                    return Promise.resolve(context.runsResponse);
                }
                if (path === 'database-backups/run') {
                    return Promise.resolve({ status: 'queued' });
                }

                return Promise.resolve(method === 'get' ? context.getResponse : context.writeResponse);
            }
            get(path, query) {
                return this.request('get', path, undefined, query);
            }
            post(path, payload) {
                return this.request('post', path, payload);
            }
            delete(path) {
                return this.request('delete', path);
            }
        }
        class NotificationsStub extends Service {
            successes = [];
            errors = [];
            success(message) {
                this.successes.push(message);
            }
            serverError(error) {
                this.errors.push(error.message);
            }
        }

        // The table reads the locale; set it before render so the first read does not
        // update tracked state mid-render.
        this.owner.lookup('service:intl').setLocale('en-us');
        this.owner.register('service:fetch', FetchStub);
        this.owner.register('service:notifications', NotificationsStub);
        this.notifications = () => this.owner.lookup('service:notifications');

        const captured = captureComponent(this.owner, 'admin/database-backups', AdminDatabaseBackupsComponent);
        this.build = async () => {
            await render(hbs`
                <div id="next-view-section-subheader-actions"></div>
                <Admin::DatabaseBackups />
            `);
            await flush();
            await settled();
            return captured.instance;
        };
    });

    test('it loads the settings and recent runs', async function (assert) {
        const component = await this.build();

        assert.deepEqual(
            this.requests.find((request) => request.path === 'database-backups/settings'),
            { method: 'get', path: 'database-backups/settings', payload: undefined, query: undefined }
        );
        assert.deepEqual(
            this.requests.find((request) => request.path === 'database-backups/runs'),
            { method: 'get', path: 'database-backups/runs', payload: undefined, query: { limit: 25 } }
        );

        assert.true(component.enabled);
        assert.strictEqual(component.dayOfWeek, '1', 'the day is kept as a string for the select');
        assert.strictEqual(component.retentionCount, '', 'no count limit reads as a blank input');
        assert.strictEqual(component.notifyEmails, 'ops@example.com, cto@example.com');

        assert.dom('[data-test-last-success]').containsText(format(this.runsResponse.runs[0].completed_at));
        assert.dom('[data-test-last-run-status="completed"]').exists();
        assert.dom('[data-test-failed-warning]').doesNotExist();
        assert.dom('[data-test-stale-warning]').doesNotExist();

        assert.dom('[data-test-frequency]').hasValue('daily');
        assert.dom('[data-test-time]').hasValue('02:30');
        assert.dom('[data-test-day-of-week]').doesNotExist('the day only matters for weekly backups');
        assert.dom('[data-test-disk]').hasValue('s3');
        assert.dom('[data-test-bucket]').hasValue('fb-backups', 'an s3 disk offers a bucket override');
        assert.dom('[data-test-path]').hasValue('backups/db');
        assert.dom('[data-test-connection="mysql"]').isChecked();
        assert.dom('[data-test-connection="sandbox"]').isNotChecked();
        assert.dom('[data-test-retention-days]').hasValue('30');
        assert.dom('[data-test-min-size]').hasValue('1024');
        assert.dom('[data-test-notify-emails]').hasValue('ops@example.com, cto@example.com');

        assert.dom('[data-test-runs-table]').containsText('fleetbase_sandbox');
        assert.dom('[data-test-runs-table]').containsText('1.5 MB');
        assert.dom('[data-test-runs-table]').containsText('1m 35s');
        assert.dom('[data-test-runs-table]').containsText('Scheduled');
        assert.dom('[data-test-backup-error-cell]').hasAttribute('title', LONG_ERROR, 'the full error is in the tooltip');
        assert.dom('[data-test-backup-pruned-cell]').exists({ count: 1 });
        assert.dom('[data-test-no-runs]').doesNotExist();
        assert.dom('#next-view-section-subheader-actions [data-test-save]').exists('save is wormholed to the subheader');
        assert.dom('#next-view-section-subheader-actions [data-test-reset]').exists();
        assert.false(component.isBusy);
    });

    test('it saves the settings in the shape the API expects', async function (assert) {
        const component = await this.build();

        await click('[data-test-enabled-toggle]');
        component.setFrequency('weekly');
        component.setDayOfWeek('5');
        component.time = '23:15';
        component.bucket = '  other-bucket ';
        component.path = ' nightly/ ';
        component.toggleConnection('sandbox', true);
        component.retentionDays = '';
        component.retentionCount = '7';
        component.minSizeBytes = '2048';
        component.notifyEmails = 'a@example.com, , b@example.com ';
        await settled();

        await click('[data-test-save]');
        await flush();

        const { method, path, payload } = this.requests.at(-1);
        assert.strictEqual(method, 'post');
        assert.strictEqual(path, 'database-backups/settings');
        assert.deepEqual(payload, {
            enabled: false,
            frequency: 'weekly',
            time: '23:15',
            day_of_week: 5,
            disk: 's3',
            bucket: 'other-bucket',
            path: 'nightly/',
            connections: ['mysql', 'sandbox'],
            retention_days: null,
            retention_count: 7,
            min_size_bytes: 2048,
            notify_on_failure: true,
            notify_emails: ['a@example.com', 'b@example.com'],
        });
        assert.strictEqual(component.time, '04:00', 'the saved response is applied');
        assert.deepEqual(this.notifications().successes, ['Database backup settings saved.']);
    });

    test('it resets to the environment defaults', async function (assert) {
        this.writeResponse = settingsResponse({ enabled: false });
        const component = await this.build();

        await click('[data-test-reset]');
        await flush();

        assert.strictEqual(this.requests.at(-1).method, 'delete');
        assert.strictEqual(this.requests.at(-1).path, 'database-backups/settings');
        assert.false(component.enabled);
        assert.deepEqual(this.notifications().successes, ['Database backups reset to the environment defaults.']);
    });

    test('it queues a backup and refreshes the run list', async function (assert) {
        await this.build();

        await click('[data-test-run-now]');
        await flush();

        assert.deepEqual(this.requests.at(-1), { method: 'post', path: 'database-backups/run', payload: {}, query: undefined });
        assert.deepEqual(this.notifications().successes, ['Backup queued. It runs in the background; use Refresh to follow its progress.']);

        const runRequests = () => this.requests.filter((request) => request.path === 'database-backups/runs').length;
        assert.strictEqual(runRequests(), 1);

        await click('[data-test-refresh-runs]');
        await flush();

        assert.strictEqual(runRequests(), 2, 'refresh fetches the runs again');
    });

    test('it reports failed loads, saves, resets and runs', async function (assert) {
        this.fail = { get: true, post: true, delete: true };
        const component = await this.build();

        // Nothing loaded, so every field still holds its initial value.
        assert.deepEqual(component.defaults, {});
        assert.strictEqual(component.dayOfWeek, '0');
        assert.strictEqual(component.bucket, '');
        assert.deepEqual(component.connections, []);
        assert.strictEqual(component.notifyEmails, '');

        const saving = component.save.perform();
        assert.true(component.isBusy, 'busy while saving');
        await saving;
        const resetting = component.reset.perform();
        assert.true(component.isBusy, 'busy while resetting');
        await resetting;
        await component.runNow.perform();

        assert.deepEqual(this.notifications().errors, ['get failed', 'get failed', 'post failed', 'delete failed', 'post failed']);
        assert.dom('[data-test-no-runs]').exists('no runs to list');
    });

    test('it shows fields only when they apply', async function (assert) {
        const component = await this.build();

        assert.deepEqual(component.frequencyOptions, FREQUENCIES);
        assert.deepEqual(
            component.dayOptions.map((day) => day.value),
            ['0', '1', '2', '3', '4', '5', '6']
        );
        assert.strictEqual(DAYS_OF_WEEK[0].label, 'Sunday', 'the week starts on Sunday, as day 0');
        assert.deepEqual(component.diskOptions, [
            { value: 'local', label: 'local (local)' },
            { value: 's3', label: 's3 (s3)' },
        ]);

        component.setFrequency('weekly');
        await settled();
        assert.true(component.isWeekly);
        assert.false(component.isHourly);
        assert.dom('[data-test-day-of-week]').hasValue('1');

        component.setFrequency('hourly');
        await settled();
        assert.true(component.isHourly);
        assert.dom('[data-test-day-of-week]').doesNotExist();

        component.setDisk('local');
        await settled();
        assert.false(component.isS3);
        assert.dom('[data-test-bucket]').doesNotExist('a local disk has no bucket');
        assert.strictEqual(component.payload().bucket, null, 'a leftover bucket is not sent for a non-s3 disk');

        component.setDisk('s3');
        component.bucket = '   ';
        assert.strictEqual(component.payload().bucket, null, 'a blank bucket means the disk default');

        component.setDisk('removed-disk');
        assert.strictEqual(component.selectedDisk, null);
        assert.false(component.isS3);

        component.toggleNotifyOnFailure(false);
        await settled();
        assert.dom('[data-test-notify-emails]').doesNotExist();

        await click('[data-test-connection="sandbox"]');
        assert.deepEqual(component.connections, ['mysql', 'sandbox'], 'checking a database adds it');
        component.toggleConnection('sandbox', true);
        assert.deepEqual(component.connections, ['mysql', 'sandbox'], 'checking it again does not duplicate it');
        component.toggleConnection('mysql', false);
        assert.deepEqual(component.connections, ['sandbox'], 'unchecking removes it');
        assert.deepEqual(component.connectionOptions, [
            { name: 'mysql', checked: false },
            { name: 'sandbox', checked: true },
        ]);
    });

    test('it warns when the last run failed or no backup has succeeded recently', async function (assert) {
        const oldSuccess = completedRun({ completed_at: ago(30 * HOUR) });
        this.getResponse = settingsResponse({}, { last_run: FAILED_RUN, last_success: oldSuccess });
        this.runsResponse = { runs: [FAILED_RUN, oldSuccess] };
        const component = await this.build();

        assert.true(component.lastRunFailed);
        assert.dom('[data-test-failed-warning]').containsText('Lost connection to server');
        assert.dom('[data-test-last-run-status="failed"]').exists();
        assert.true(component.isStale, '30 hours without a success');
        assert.dom('[data-test-stale-warning]').exists();

        component.toggleEnabled(false);
        await settled();
        assert.false(component.isStale, 'a disabled schedule is never stale');
        assert.dom('[data-test-stale-warning]').doesNotExist();

        component.toggleEnabled(true);
        component.lastSuccess = null;
        component.lastRun = null;
        await settled();
        assert.true(component.isStale, 'enabled and never succeeded');
        assert.strictEqual(component.lastSuccessLabel, null);
        assert.strictEqual(component.lastRunLabel, null);
        assert.false(component.lastRunFailed);
        assert.dom('[data-test-last-success]').containsText('Never');
        assert.dom('[data-test-last-run]').containsText('None yet');
    });

    test('it keeps the status summary when the run list has nothing newer', async function (assert) {
        this.runsResponse = undefined;
        const component = await this.build();

        assert.deepEqual(component.runs, [], 'a missing response lists no runs');
        assert.strictEqual(component.lastRun.id, 'run-ok', 'the settings payload still supplies the last run');

        this.runsResponse = { runs: [] };
        await component.loadRuns.perform();
        assert.strictEqual(component.lastRun.id, 'run-ok', 'an empty list changes nothing');

        this.runsResponse = { runs: [FAILED_RUN] };
        await component.loadRuns.perform();
        assert.strictEqual(component.lastRun.id, 'run-failed', 'the newest run becomes the last run');
        assert.strictEqual(component.lastSuccess.id, 'run-ok', 'no success in the list keeps the known one');
    });

    test('it formats runs for the table', async function (assert) {
        const component = await this.build();
        const [ok, failed, pruned] = component.runRows;

        assert.strictEqual(ok.startedLabel, format(ok.started_at));
        assert.strictEqual(ok.databaseLabel, 'fleetbase');
        assert.strictEqual(ok.triggerLabel, 'Scheduled');
        assert.strictEqual(ok.sizeLabel, '1.5 MB');
        assert.strictEqual(ok.durationLabel, '1m 35s');
        assert.strictEqual(ok.errorPreview, null);
        assert.false(ok.isPruned);
        assert.strictEqual(ok.prunedLabel, null);

        assert.strictEqual(failed.triggerLabel, 'Manual');
        assert.strictEqual(failed.sizeLabel, '—');
        assert.strictEqual(failed.durationLabel, '450 ms');
        assert.strictEqual(failed.errorPreview, `${LONG_ERROR.slice(0, 80)}…`, 'long errors are truncated');

        assert.strictEqual(pruned.triggerLabel, 'Console');
        assert.strictEqual(pruned.durationLabel, '4.2 s');
        assert.true(pruned.isPruned);
        assert.strictEqual(pruned.prunedLabel, format(pruned.pruned_at));

        component.runs = [{ status: 'running', trigger: 'cli', connection: 'mysql' }, { status: 'completed' }, { status: 'failed', database: 'db', error: 'disk full' }];
        const [running, bare, short] = component.runRows;

        assert.strictEqual(running.databaseLabel, 'mysql', 'falls back to the connection name');
        assert.strictEqual(running.triggerLabel, 'cli', 'an unknown trigger shows as sent');
        assert.strictEqual(running.startedLabel, null);
        assert.strictEqual(bare.databaseLabel, '—');
        assert.strictEqual(bare.triggerLabel, '—');
        assert.strictEqual(short.errorPreview, 'disk full', 'short errors are shown whole');
    });

    test('it formats sizes, durations and times', async function (assert) {
        assert.strictEqual(formatBytes(null), '—');
        assert.strictEqual(formatBytes(undefined), '—');
        assert.strictEqual(formatBytes(''), '—');
        assert.strictEqual(formatBytes('lots'), '—');
        assert.strictEqual(formatBytes(512), '512 B');
        assert.strictEqual(formatBytes(1536), '1.5 KB');
        assert.strictEqual(formatBytes(5 * 1024 ** 3), '5 GB');
        assert.strictEqual(formatBytes(1024 ** 5), '1024 TB', 'terabytes is the largest unit');

        assert.strictEqual(formatDuration(null), '—');
        assert.strictEqual(formatDuration(undefined), '—');
        assert.strictEqual(formatDuration(999), '999 ms');
        assert.strictEqual(formatDuration(1500), '1.5 s');
        assert.strictEqual(formatDuration(125000), '2m 5s');

        assert.strictEqual(formatDateTime(null), null);
        assert.strictEqual(formatDateTime('not a date'), null);
        assert.strictEqual(formatDateTime('2026-10-06T02:30:00Z'), format('2026-10-06T02:30:00Z'));
    });

    test('it falls back to safe values for a sparse response', async function (assert) {
        const component = await this.build();

        component.apply();
        assert.false(component.enabled);
        assert.strictEqual(component.frequency, 'daily');
        assert.strictEqual(component.time, '02:00');
        assert.strictEqual(component.dayOfWeek, '0');
        assert.strictEqual(component.disk, '');
        assert.strictEqual(component.bucket, '');
        assert.strictEqual(component.path, '');
        assert.deepEqual(component.connections, []);
        assert.strictEqual(component.retentionDays, '');
        assert.strictEqual(component.retentionCount, '');
        assert.strictEqual(component.minSizeBytes, 0);
        assert.false(component.notifyOnFailure);
        assert.strictEqual(component.notifyEmails, '');
        assert.deepEqual(component.defaults, {});
        assert.deepEqual(component.disks, []);
        assert.deepEqual(component.availableConnections, []);
        assert.strictEqual(component.lastRun, null);
        assert.strictEqual(component.lastSuccess, null);
        assert.strictEqual(component.minSizeLabel, '0 B');

        component.bucket = null;
        component.path = null;
        component.notifyEmails = null;
        component.retentionDays = null;
        component.retentionCount = undefined;
        component.minSizeBytes = 'not a number';

        assert.deepEqual(component.payload(), {
            enabled: false,
            frequency: 'daily',
            time: '02:00',
            day_of_week: 0,
            disk: '',
            bucket: null,
            path: '',
            connections: [],
            retention_days: null,
            retention_count: null,
            min_size_bytes: 0,
            notify_on_failure: false,
            notify_emails: [],
        });
    });
});

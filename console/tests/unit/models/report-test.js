import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';
import Service from '@ember/service';
import ReportModel from '@fleetbase/console/models/report';
import config from 'ember-get-config';

// A query_config shaped the way the model expects, with knobs for each feature.
function queryConfig(overrides = {}) {
    return {
        table: { name: 'orders', label: 'Orders' },
        columns: ['id', 'status'],
        ...overrides,
    };
}

module('Unit | Model | report', function (hooks) {
    setupTest(hooks);

    hooks.beforeEach(function () {
        this.posted = [];
        this.postResponse = () => Promise.resolve({ ok: true });
        const self = this;

        class FetchStub extends Service {
            post(path, payload) {
                self.posted.push({ path, payload });
                return self.postResponse(path, payload);
            }
        }
        this.owner.register('service:fetch', FetchStub);

        this.store = this.owner.lookup('service:store');
        this.report = (attrs = {}) => this.store.createRecord('report', attrs);
    });

    test('countConditionsRecursively counts leaf conditions across nested groups', function (assert) {
        const report = this.report({});

        assert.strictEqual(report.countConditionsRecursively([{ field: 'a' }, { conditions: [{ field: 'b' }, { field: 'c' }] }]), 3);
        assert.strictEqual(report.countConditionsRecursively(null), 0, 'non-array yields 0');
        assert.strictEqual(report.countConditionsRecursively([]), 0);
    });

    test('extractConditionsSummary flattens leaf conditions with labels', function (assert) {
        const report = this.report({});

        const summary = report.extractConditionsSummary([
            { field: { label: 'Name', table: 't1' }, operator: { label: '=' }, value: 'x' },
            { conditions: [{ field: { name: 'Age', table: 't2' }, operator: { value: '>' }, value: 18 }] },
        ]);

        assert.strictEqual(summary.length, 2);
        assert.strictEqual(summary[0].field, 'Name');
        assert.strictEqual(summary[0].operator, '=');
        assert.strictEqual(summary[1].field, 'Age', 'falls back to field name');
        assert.strictEqual(summary[1].operator, '>', 'falls back to operator value');
        assert.strictEqual(report.extractConditionsSummary(null).length, 0, 'non-array yields an empty summary');
    });

    test('fillResult copies columns/data/meta and flags the report as generated', function (assert) {
        const report = this.report({});

        report.fillResult({ columns: ['a', 'b'], data: [[1, 2]], meta: { total_rows: 5, execution_time_ms: 12 } });

        assert.deepEqual(report.result_columns, ['a', 'b']);
        assert.strictEqual(report.row_count, 5);
        assert.strictEqual(report.execution_time, 12);
        assert.true(report.is_generated);
    });

    test('fillResult applies safe defaults when passed an empty result', function (assert) {
        const report = this.report({});

        report.fillResult();

        assert.deepEqual(report.result_columns, []);
        assert.strictEqual(report.row_count, 0);
        assert.strictEqual(report.execution_time, -1);
    });

    test('hasValidConfig requires a named table and at least one column', function (assert) {
        assert.false(this.report({}).hasValidConfig, 'no config at all');
        assert.false(this.report({ query_config: { columns: ['id'] } }).hasValidConfig, 'no table');
        assert.false(this.report({ query_config: queryConfig({ columns: [] }) }).hasValidConfig, 'no columns');
        assert.true(this.report({ query_config: queryConfig() }).hasValidConfig);
    });

    test('tableName and tableLabel read the config and fall back', function (assert) {
        assert.strictEqual(this.report({}).tableName, '', 'missing config yields an empty name');
        assert.strictEqual(this.report({ query_config: queryConfig() }).tableLabel, 'Orders');
        assert.strictEqual(this.report({ query_config: queryConfig({ table: { name: 'orders' } }) }).tableLabel, 'orders', 'the label falls back to the table name');
    });

    test('totalSelectedColumns adds the joined tables columns', function (assert) {
        assert.strictEqual(this.report({ query_config: queryConfig() }).totalSelectedColumns, 2);

        const joined = this.report({
            query_config: queryConfig({ joins: [{ table: 'customers', selectedColumns: ['name', 'email'] }, { table: 'places' }] }),
        });
        assert.strictEqual(joined.totalSelectedColumns, 4, 'joins without columns contribute nothing');
    });

    test('hasJoins and joinedTables describe the configured joins', function (assert) {
        assert.false(this.report({ query_config: queryConfig() }).hasJoins);
        assert.deepEqual(this.report({ query_config: queryConfig() }).joinedTables, []);

        const joined = this.report({
            query_config: queryConfig({ joins: [{ table: 'customers', type: 'left', selectedColumns: ['name'] }] }),
        });

        assert.true(joined.hasJoins);
        assert.deepEqual(joined.joinedTables, [{ table: 'customers', label: 'customers', type: 'left', columnsCount: 1 }]);
    });

    test('the feature flags report grouping, sorting, conditions and limit', function (assert) {
        const bare = this.report({ query_config: queryConfig() });
        assert.false(bare.hasConditions);
        assert.strictEqual(bare.conditionsCount, 0);
        assert.false(bare.hasGrouping);
        assert.false(bare.hasSorting);
        assert.false(bare.hasLimit);
        assert.deepEqual(bare.conditionsSummary, [], 'no conditions yields an empty summary');

        const full = this.report({
            query_config: queryConfig({
                conditions: [{ field: { label: 'Status' }, operator: { label: '=' }, value: 'open' }],
                groupBy: ['status'],
                sortBy: ['id'],
                limit: 50,
            }),
        });
        assert.true(full.hasConditions);
        assert.strictEqual(full.conditionsCount, 1);
        assert.true(full.hasGrouping);
        assert.true(full.hasSorting);
        assert.true(full.hasLimit);
        assert.strictEqual(full.conditionsSummary.length, 1);

        assert.false(this.report({ query_config: queryConfig({ limit: 0 }) }).hasLimit, 'a zero limit is not a limit');
    });

    test('complexity scores columns, joins, conditions and grouping', function (assert) {
        assert.strictEqual(this.report({ query_config: queryConfig() }).complexity, 'simple', 'two columns scores 2');

        const moderate = this.report({
            query_config: queryConfig({ joins: [{ table: 'a', selectedColumns: ['x'] }], conditions: [{ field: 'a' }, { field: 'b' }] }),
        });
        assert.strictEqual(moderate.complexity, 'moderate', '3 columns + 3 join + 4 conditions = 10');

        const complex = this.report({
            query_config: queryConfig({
                columns: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'],
                joins: [
                    { table: 'a', selectedColumns: ['x'] },
                    { table: 'b', selectedColumns: ['y'] },
                ],
                conditions: [{ field: 'a' }, { field: 'b' }, { field: 'c' }],
                groupBy: ['a'],
            }),
        });
        assert.strictEqual(complex.complexity, 'complex');
    });

    test('estimatedPerformance derives from complexity and shape', function (assert) {
        assert.strictEqual(this.report({ query_config: queryConfig() }).estimatedPerformance, 'fast', 'simple and narrow is fast');

        const moderate = this.report({
            query_config: queryConfig({ joins: [{ table: 'a', selectedColumns: ['x'] }], conditions: [{ field: 'a' }, { field: 'b' }] }),
        });
        assert.strictEqual(moderate.estimatedPerformance, 'moderate');

        const slow = this.report({
            query_config: queryConfig({
                columns: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'],
                joins: [
                    { table: 'a', selectedColumns: ['x'] },
                    { table: 'b', selectedColumns: ['y'] },
                ],
                conditions: [{ field: 'a' }, { field: 'b' }, { field: 'c' }],
                groupBy: ['a'],
            }),
        });
        assert.strictEqual(slow.estimatedPerformance, 'slow');
    });

    test('the badge helpers map complexity and performance, with a fallback', function (assert) {
        const simple = this.report({ query_config: queryConfig() });
        assert.strictEqual(simple.getComplexityBadgeClass(), 'badge-success');
        assert.strictEqual(simple.getPerformanceBadgeClass(), 'badge-success');

        // complexity/estimatedPerformance are getters, so shadow them to reach the fallback.
        const odd = this.report({});
        Object.defineProperty(odd, 'complexity', { configurable: true, value: 'unheard-of' });
        Object.defineProperty(odd, 'estimatedPerformance', { configurable: true, value: 'unheard-of' });
        assert.strictEqual(odd.getComplexityBadgeClass(), 'badge-secondary');
        assert.strictEqual(odd.getPerformanceBadgeClass(), 'badge-secondary');
    });

    test('getQuerySummary describes only the features in use', function (assert) {
        const simple = this.report({ query_config: queryConfig() });
        assert.strictEqual(simple.getQuerySummary(), '2 columns from Orders');

        const full = this.report({
            query_config: queryConfig({
                joins: [{ table: 'customers', selectedColumns: ['name'] }],
                conditions: [{ field: 'a' }],
                groupBy: ['status'],
                sortBy: ['id'],
                limit: 50,
            }),
        });
        const summary = full.getQuerySummary();
        assert.ok(summary.includes('3 columns from Orders'), summary);
        assert.ok(summary.includes('1 joins'));
        assert.ok(summary.includes('1 conditions'));
        assert.ok(summary.includes('grouped'));
        assert.ok(summary.includes('sorted'));
        assert.ok(summary.includes('limited to 50 rows'));
    });

    test('statusDisplay and statusClass map known statuses and fall back', function (assert) {
        assert.strictEqual(this.report({ status: 'draft' }).statusDisplay, 'Draft');
        assert.strictEqual(this.report({ status: 'active' }).statusClass, 'status-active');
        assert.strictEqual(this.report({ status: 'archived' }).statusDisplay, 'Archived');
        assert.strictEqual(this.report({ status: 'error' }).statusClass, 'status-error');
        assert.strictEqual(this.report({ status: 'weird' }).statusDisplay, 'weird', 'unknown statuses pass through');
        assert.strictEqual(this.report({ status: 'weird' }).statusClass, 'status-unknown');
    });

    test('the display getters cover their empty and populated cases', function (assert) {
        const empty = this.report({});
        assert.strictEqual(empty.lastExecutedDisplay, 'Never executed');
        assert.strictEqual(empty.averageExecutionTimeDisplay, 'N/A');
        assert.strictEqual(empty.executionCountDisplay, 0);
        assert.strictEqual(empty.lastResultCountDisplay, 'N/A');
        assert.deepEqual(empty.availableExportFormats, ['csv', 'excel', 'json'], 'defaults are offered');
        assert.deepEqual(empty.tagsList, []);
        assert.deepEqual(empty.sharedWithList, []);
        assert.strictEqual(empty.scheduleInfo, null, 'unscheduled reports have no schedule info');

        const executed = this.report({ last_executed_at: new Date('2026-05-06T14:30:00Z'), export_formats: ['pdf'], tags: ['ops'] });
        assert.ok(executed.lastExecutedDisplay.length > 0);
        assert.notStrictEqual(executed.lastExecutedDisplay, 'Never executed');
        assert.deepEqual(executed.availableExportFormats, ['pdf']);
        assert.deepEqual(executed.tagsList, ['ops']);
    });

    test('scheduleInfo reports the schedule when the report is scheduled', function (assert) {
        const report = this.report({ is_scheduled: true });

        assert.deepEqual(report.scheduleInfo, { frequency: undefined, nextRun: undefined, timezone: 'UTC' }, 'timezone defaults to UTC');
    });

    test('the timestamp getters format created_at and updated_at', function (assert) {
        const at = new Date('2026-05-06T14:30:00Z');
        const report = this.report({ created_at: at, updated_at: at });

        assert.ok(report.createdAt.startsWith('2026-05-06'), report.createdAt);
        assert.ok(report.updatedAt.startsWith('2026-05-06'));
        assert.strictEqual(typeof report.createdAgo, 'string');
        assert.strictEqual(typeof report.updatedAgo, 'string');
    });

    test('execute posts to the saved-report endpoint when the report has an id', async function (assert) {
        const saved = this.store.push({ data: { id: 'rpt_1', type: 'report' } });
        saved.query_config = queryConfig();

        await saved.execute();

        assert.strictEqual(this.posted.at(-1).path, 'reports/rpt_1/execute');
        assert.deepEqual(this.posted.at(-1).payload.query_config, queryConfig());
    });

    test('execute posts to the ad-hoc endpoint for an unsaved report', async function (assert) {
        await this.report({ query_config: queryConfig() }).execute();

        assert.strictEqual(this.posted.at(-1).path, 'reports/execute-query');
    });

    test('execute propagates a server failure', async function (assert) {
        this.postResponse = () => Promise.reject(new Error('bad query'));

        await assert.rejects(this.report({}).execute(), /bad query/);
    });

    test('executeQuery, validate and analyze post the query config to their endpoints', async function (assert) {
        const report = this.report({ query_config: queryConfig() });

        await report.executeQuery();
        assert.strictEqual(this.posted.at(-1).path, 'reports/execute-query');

        await report.validate();
        assert.strictEqual(this.posted.at(-1).path, 'reports/validate-query');

        await report.analyze();
        assert.strictEqual(this.posted.at(-1).path, 'reports/analyze-query');
        assert.deepEqual(this.posted.at(-1).payload, { query_config: queryConfig() });
    });

    test('export posts the requested format and options', async function (assert) {
        const saved = this.store.push({ data: { id: 'rpt_1', type: 'report' } });

        await saved.export();
        assert.deepEqual(this.posted.at(-1), { path: 'reports/rpt_1/export', payload: { format: 'csv', options: {} } }, 'defaults to csv');

        await saved.export('xlsx', { sheet: 'one' });
        assert.deepEqual(this.posted.at(-1).payload, { format: 'xlsx', options: { sheet: 'one' } });
    });
});

/**
 * The static query helpers are not tied to a saved report and have no container to resolve a
 * service from, so they go through fleetbaseApiFetch, which builds the request itself. That
 * means stubbing the global fetch rather than service:fetch.
 */
module('Unit | Model | report | static query API', function (hooks) {
    setupTest(hooks);

    hooks.beforeEach(function () {
        this.requests = [];
        this.response = {};
        const self = this;

        this.originalFetch = window.fetch;
        window.fetch = (url, options) => {
            self.requests.push({ url, method: options.method, body: options.body ? JSON.parse(options.body) : undefined, headers: options.headers });

            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve(self.response),
            });
        };

        // fleetbaseApiFetch prefixes every path with the configured API host and namespace.
        this.prefix = `${config.API.host}/${config.API.namespace}/`;
        this.lastRequest = () => self.requests.at(-1);
    });

    hooks.afterEach(function () {
        window.fetch = this.originalFetch;
    });

    test('executeQuery posts the config to the ad-hoc endpoint', async function (assert) {
        this.response = { ok: true };
        const queryConfig = { table: { name: 'orders' } };

        const response = await ReportModel.executeQuery(queryConfig);

        const request = this.lastRequest();
        assert.strictEqual(request.url, `${this.prefix}reports/execute-query`);
        assert.strictEqual(request.method, 'POST');
        assert.deepEqual(request.body, { query_config: queryConfig });
        assert.deepEqual(response, { ok: true }, 'the server response is handed back');
    });

    test('exportQuery posts the config with its format and options', async function (assert) {
        const queryConfig = { table: { name: 'orders' } };

        await ReportModel.exportQuery(queryConfig, 'pdf', { landscape: true });

        const request = this.lastRequest();
        assert.strictEqual(request.url, `${this.prefix}reports/export-query`);
        assert.deepEqual(request.body, { query_config: queryConfig, format: 'pdf', options: { landscape: true } });
    });

    test('exportQuery defaults to csv with no options', async function (assert) {
        await ReportModel.exportQuery({ table: { name: 'orders' } });

        assert.strictEqual(this.lastRequest().body.format, 'csv');
        assert.deepEqual(this.lastRequest().body.options, {});
    });

    test('validateQuery and analyzeQuery post to their own endpoints', async function (assert) {
        const queryConfig = { table: { name: 'orders' } };

        await ReportModel.validateQuery(queryConfig);
        assert.strictEqual(this.lastRequest().url, `${this.prefix}reports/validate-query`);
        assert.deepEqual(this.lastRequest().body, { query_config: queryConfig });

        await ReportModel.analyzeQuery(queryConfig);
        assert.strictEqual(this.lastRequest().url, `${this.prefix}reports/analyze-query`);
        assert.deepEqual(this.lastRequest().body, { query_config: queryConfig });
    });

    test('getTables unwraps the table list from the response', async function (assert) {
        this.response = { tables: [{ name: 'orders' }] };

        const tables = await ReportModel.getTables();

        const request = this.lastRequest();
        assert.strictEqual(request.url, `${this.prefix}reports/tables`, 'no empty query string is appended');
        assert.strictEqual(request.method, 'GET');
        assert.deepEqual(tables, [{ name: 'orders' }], 'the tables are unwrapped, not the envelope');
    });

    test('getTableSchema requests the schema for the named table', async function (assert) {
        this.response = { schema: { columns: ['id'] } };

        const schema = await ReportModel.getTableSchema('orders');

        assert.strictEqual(this.lastRequest().url, `${this.prefix}reports/tables/orders/schema`);
        assert.deepEqual(schema, { columns: ['id'] });
    });

    test('getExportFormats unwraps the available formats', async function (assert) {
        this.response = { formats: ['csv', 'pdf'] };

        const formats = await ReportModel.getExportFormats();

        assert.strictEqual(this.lastRequest().url, `${this.prefix}reports/export-formats`);
        assert.deepEqual(formats, ['csv', 'pdf']);
    });

    test('a persisted session is sent as a bearer token', async function (assert) {
        window.localStorage.setItem('ember_simple_auth-session', JSON.stringify({ authenticated: { token: 'session-token' } }));

        try {
            await ReportModel.getTables();

            assert.strictEqual(this.lastRequest().headers.Authorization, 'Bearer session-token');
        } finally {
            window.localStorage.removeItem('ember_simple_auth-session');
        }
    });

    test('an unauthenticated caller sends no authorization header', async function (assert) {
        await ReportModel.getTables();

        assert.strictEqual(this.lastRequest().headers.Authorization, undefined);
    });
});

module('Unit | Model | report | execution display', function (hooks) {
    setupTest(hooks);

    hooks.beforeEach(function () {
        this.store = this.owner.lookup('service:store');
    });

    // These two read properties the model never declares as attributes, so assigning them
    // does not invalidate the @computed that already cached a value. Build a fresh record
    // per case rather than reassigning on one.
    test('averageExecutionTimeDisplay switches from milliseconds to seconds at a second', function (assert) {
        assert.strictEqual(this.store.createRecord('report').averageExecutionTimeDisplay, 'N/A', 'nothing recorded yet');

        const quick = this.store.createRecord('report');
        quick.average_execution_time = 512.4;
        assert.strictEqual(quick.averageExecutionTimeDisplay, '512ms', 'sub-second timings are rounded to ms');

        const slow = this.store.createRecord('report');
        slow.average_execution_time = 1500;
        assert.strictEqual(slow.averageExecutionTimeDisplay, '1.50s', 'longer runs are shown in seconds');
    });

    test('lastResultCountDisplay formats a count and reports when there is none', function (assert) {
        assert.strictEqual(this.store.createRecord('report').lastResultCountDisplay, 'N/A', 'undefined reads as N/A');

        const nulled = this.store.createRecord('report');
        nulled.last_result_count = null;
        assert.strictEqual(nulled.lastResultCountDisplay, 'N/A', 'so does null');

        const counted = this.store.createRecord('report');
        counted.last_result_count = 1234567;
        assert.strictEqual(counted.lastResultCountDisplay, (1234567).toLocaleString(), 'a real count is thousands-separated');

        const zero = this.store.createRecord('report');
        zero.last_result_count = 0;
        assert.strictEqual(zero.lastResultCountDisplay, '0', 'zero is a real count, not "no result"');
    });
});

module('Unit | Model | report | sparse query configs', function (hooks) {
    setupTest(hooks);

    hooks.beforeEach(function () {
        this.report = (query_config) => this.owner.lookup('service:store').createRecord('report', { query_config });
    });

    test('a query with a table but no columns selects nothing', function (assert) {
        const report = this.report({ table: { name: 'orders', label: 'Orders' } });

        assert.deepEqual(report.selectedColumns, [], 'the column list is empty rather than undefined');
        assert.strictEqual(report.totalSelectedColumns, 0);
    });

    test('a join that selects no columns is counted as zero rather than blank', function (assert) {
        const report = this.report({
            table: { name: 'orders' },
            columns: ['id'],
            joins: [
                { table: 'drivers', type: 'left', selectedColumns: ['name', 'phone'] },
                { table: 'payloads', type: 'inner' },
            ],
        });

        assert.deepEqual(
            report.joinedTables.map((join) => [join.table, join.label, join.columnsCount]),
            [
                ['drivers', 'drivers', 2],
                ['payloads', 'payloads', 0],
            ],
            'a join with no selection contributes no columns and falls back to its table name as a label'
        );
    });

    test('a condition with neither a field nor an operator is left out of the summary', function (assert) {
        const report = this.report({
            table: { name: 'orders' },
            conditions: [{ field: { name: 'status', label: 'Status' }, operator: { value: '=', label: 'is' }, value: 'created' }, { logic: 'and' }, {}],
        });

        assert.deepEqual(
            report.conditionsSummary.map((condition) => condition.field),
            ['Status'],
            'half-built conditions from the query builder are skipped rather than rendered blank'
        );
    });
});

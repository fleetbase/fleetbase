import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';

const sampleSections = [
    {
        name: 'IAM',
        slug: 'iam',
        total: 120,
        trend: 12.4,
        trend_direction: 'up',
        actions: {
            created: 5,
            updated: 3,
            deleted: 1,
        },
        last_activity: '2025-11-20T10:00:00Z',
    },
    {
        name: 'Chat',
        slug: 'chat',
        total_activities: 80,
        trend: -5,
        trend_direction: 'down',
        actions: {
            deleted: 2,
        },
    },
    {
        name: 'Notifications',
        slug: 'notifications',
        total: 60,
        trend: '0',
        actions: {
            viewed: 4,
        },
    },
];

module('Unit | Component | bitacora-report-card', function (hooks) {
    setupTest(hooks);

    hooks.beforeEach(function () {
        class IntlStub {
            t(key) {
                return `[${key}]`;
            }
        }

        this.owner.register('service:intl', IntlStub);
    });

    function instantiateComponent(additionalArgs = {}) {
        return this.owner.factoryFor('component:bitacora-report-card').create({
            intl: this.owner.lookup('service:intl'),
            fetch: { get: () => Promise.resolve() },
            notifications: {},
            router: {},
            args: {
                sections: sampleSections,
                pageSize: 2,
                chartLimit: 2,
                chartPalette: ['#111111', '#222222', '#333333'],
                ...additionalArgs,
            },
        });
    }

    test('normalizes sections, pagination and chart data', function (assert) {
        const component = instantiateComponent.call(this);

        assert.strictEqual(component.resolvedSections.length, sampleSections.length, 'Sections are normalized');
        assert.strictEqual(component.totalPages, 2, 'Total pages calculated');
        assert.strictEqual(component.paginatedSections.length, 2, 'Page 1 honors pageSize');

        component.currentPage = 2;
        assert.strictEqual(component.paginatedSections.length, 1, 'Second page has remaining items');
        assert.true(component.hasPagination, 'Pagination is enabled');
        assert.false(component.canGoNext, 'No next page after last');
        assert.true(component.canGoPrevious, 'Can navigate back');
        assert.strictEqual(component.paginationInfo, `3-3 de ${sampleSections.length}`, 'Pagination info shows correct range');

        const chart = component.chartData;
        assert.deepEqual(chart.labels, ['IAM', 'Chat'], 'Chart respects chartLimit');
        assert.strictEqual(chart.datasets[0].label, '[bitacora.report-card.chartLabel]', 'Chart label uses intl');
        assert.strictEqual(chart.trends.length, 2, 'Chart trends array matches sections sliced');
        assert.true(component.showChart, 'Chart is shown when data exists');
    });

    test('buildDatasetColors loops palette when length exceeds available colors', function (assert) {
        const component = instantiateComponent.call(this);

        const colors = component.buildDatasetColors(5);
        assert.deepEqual(colors, ['#111111', '#222222', '#333333', '#111111', '#222222'], 'Palette cycles when necessary');
        assert.deepEqual(component.buildDatasetColors(0), [], 'Zero length returns empty array');
    });

    test('prepareExportData flattens actions and includes headers', function (assert) {
        const component = instantiateComponent.call(this);
        const rows = component.prepareExportData();

        assert.strictEqual(rows.length, sampleSections.length + 1, 'Includes header row');
        assert.deepEqual(rows[0], [
            'Sección',
            'Total Actividades',
            'Tendencia',
            'Creadas',
            'Actualizadas',
            'Eliminadas',
            'Vistas',
            'Última Actividad',
        ], 'Header is retained');
        const iamRow = rows.find((row) => row[0] === 'IAM');
        assert.ok(iamRow, 'IAM row exists in export data');
        assert.strictEqual(iamRow[3], 5, 'Created count mapped');
        assert.strictEqual(iamRow[4], 3, 'Updated count mapped');
        assert.strictEqual(
            iamRow[5],
            1,
            'Deleted count reflected even when other action keys are present'
        );
        assert.ok(iamRow[7], 'Last activity label is populated when available');
    });

    test('helper methods behave as expected', function (assert) {
        const component = instantiateComponent.call(this);

        assert.true(component.isTrendDown('down'), 'Detects downward trends');
        assert.false(component.isTrendDown('up'), 'Other values are not downward');
        assert.strictEqual(component.loadingLabel, '[bitacora.report-card.loading]', 'Intl fallback used');
        assert.strictEqual(component.title, '[bitacora.report-card.title]', 'Title uses intl');
    });
});


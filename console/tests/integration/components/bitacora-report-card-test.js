import { module, test } from 'qunit';
import { setupRenderingTest } from '@fleetbase/console/tests/helpers';
import { render, click, waitFor } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import { setupMirage } from 'ember-cli-mirage/test-support';

module('Integration | Component | bitacora-report-card', function (hooks) {
    setupRenderingTest(hooks);
    setupMirage(hooks);

    hooks.beforeEach(function () {
        // Mock fetch service
        this.owner.lookup('service:fetch').get = async () => {
            return {
                sections: [
                    {
                        name: 'IAM',
                        slug: 'iam',
                        total_activities: 145,
                        actions: {
                            created: 45,
                            updated: 78,
                            deleted: 22,
                        },
                        trend: 12.5,
                        trend_direction: 'up',
                        last_activity: '2025-11-21T10:30:00Z',
                    },
                    {
                        name: 'Chat',
                        slug: 'chat',
                        total_activities: 89,
                        actions: {
                            created: 23,
                            updated: 54,
                            deleted: 12,
                        },
                        trend: -5.2,
                        trend_direction: 'down',
                        last_activity: '2025-11-21T09:15:00Z',
                    },
                    {
                        name: 'Notifications',
                        slug: 'notifications',
                        total_activities: 67,
                        actions: {
                            created: 34,
                            updated: 28,
                            viewed: 5,
                        },
                        trend: 8.3,
                        trend_direction: 'up',
                        last_activity: '2025-11-21T08:45:00Z',
                    },
                    {
                        name: 'Dashboard',
                        slug: 'dashboard',
                        total_activities: 45,
                        actions: {
                            viewed: 45,
                        },
                        trend: 2.1,
                        trend_direction: 'up',
                        last_activity: '2025-11-21T07:30:00Z',
                    },
                    {
                        name: 'Settings',
                        slug: 'settings',
                        total_activities: 23,
                        actions: {
                            updated: 23,
                        },
                        trend: -15.4,
                        trend_direction: 'down',
                        last_activity: '2025-11-21T06:20:00Z',
                    },
                ],
            };
        };
    });

    test('it renders with loading state initially', async function (assert) {
        await render(hbs`<BitacoraReportCard />`);

        // Should show loading state initially
        assert.dom('.bitacora-report-card__loading').exists('Loading state is displayed');
    });

    test('it renders sections after loading', async function (assert) {
        await render(hbs`<BitacoraReportCard />`);

        // Wait for data to load
        await waitFor('.bitacora-report-card__sections', { timeout: 3000 });

        // Should display sections
        assert.dom('.bitacora-report-card__section').exists({ count: 4 }, 'Displays 4 sections (first page)');
        assert.dom('.bitacora-report-card__section-name').hasText('IAM', 'First section is IAM');
    });

    test('it displays period selector', async function (assert) {
        await render(hbs`<BitacoraReportCard />`);

        await waitFor('.bitacora-report-card__controls', { timeout: 3000 });

        assert.dom('.bitacora-report-card__period-label').hasText('Periodo', 'Period label is displayed');
        assert.dom('select').exists('Period selector exists');
    });

    test('it displays trend indicators with correct colors', async function (assert) {
        await render(hbs`<BitacoraReportCard />`);

        await waitFor('.bitacora-report-card__sections', { timeout: 3000 });

        // Check for up trend (green)
        assert.dom('.bitacora-report-card__trend--up').exists('Up trend indicator exists');

        // Check for down trend (red)
        assert.dom('.bitacora-report-card__trend--down').exists('Down trend indicator exists');
    });

    test('it displays action breakdown for each section', async function (assert) {
        await render(hbs`<BitacoraReportCard />`);

        await waitFor('.bitacora-report-card__sections', { timeout: 3000 });

        assert.dom('.bitacora-report-card__action-chip').exists({ count: 10 }, 'Action chips are displayed');
    });

    test('it displays pagination controls when more than 4 sections', async function (assert) {
        await render(hbs`<BitacoraReportCard />`);

        await waitFor('.bitacora-report-card__pagination', { timeout: 3000 });

        assert.dom('.bitacora-report-card__pagination').exists('Pagination is displayed');
        assert.dom('.bitacora-report-card__pagination-info').hasText('1-4 de 5', 'Pagination info is correct');
        assert.dom('.bitacora-report-card__pagination-current').hasText('Página 1 de 2', 'Current page is displayed');
    });

    test('it navigates to next page when clicking next button', async function (assert) {
        await render(hbs`<BitacoraReportCard />`);

        await waitFor('.bitacora-report-card__pagination', { timeout: 3000 });

        // Click next button
        const nextButton = this.element.querySelectorAll('.bitacora-report-card__pagination-btn')[1];
        await click(nextButton);

        // Should show page 2
        assert.dom('.bitacora-report-card__pagination-current').hasText('Página 2 de 2', 'Navigated to page 2');
        assert.dom('.bitacora-report-card__pagination-info').hasText('5-5 de 5', 'Pagination info updated');
    });

    test('it displays export buttons', async function (assert) {
        await render(hbs`<BitacoraReportCard />`);

        await waitFor('.bitacora-report-card__footer', { timeout: 3000 });

        assert.dom('.bitacora-report-card__footer').exists('Footer is displayed');
        // Export buttons are rendered by Button component, check for their presence
        assert.dom('.bitacora-report-card__export-btn').exists({ count: 2 }, 'CSV and Excel export buttons exist');
    });

    test('it displays chart when showChart is true', async function (assert) {
        await render(hbs`<BitacoraReportCard />`);

        await waitFor('.bitacora-report-card__chart', { timeout: 3000 });

        assert.dom('.bitacora-report-card__chart').exists('Chart container is displayed');
    });

    test('it displays empty state when no sections', async function (assert) {
        // Override fetch to return empty sections
        this.owner.lookup('service:fetch').get = async () => {
            return { sections: [] };
        };

        await render(hbs`<BitacoraReportCard />`);

        await waitFor('.bitacora-report-card__empty', { timeout: 3000 });

        assert.dom('.bitacora-report-card__empty').exists('Empty state is displayed');
    });

    test('it displays error state on API failure', async function (assert) {
        // Override fetch to throw error
        this.owner.lookup('service:fetch').get = async () => {
            throw new Error('API Error');
        };

        await render(hbs`<BitacoraReportCard />`);

        await waitFor('.bitacora-report-card__error', { timeout: 3000 });

        assert.dom('.bitacora-report-card__error').exists('Error state is displayed');
    });

    test('it accepts external sections via @sections prop', async function (assert) {
        this.set('externalSections', [
            {
                name: 'External Section',
                total: 100,
                actions: { created: 50, updated: 50 },
                trend: '+10%',
                trendDirection: 'up',
            },
        ]);

        await render(hbs`<BitacoraReportCard @sections={{this.externalSections}} />`);

        // Should not show loading state
        assert.dom('.bitacora-report-card__loading').doesNotExist('Loading state is not displayed');
        assert.dom('.bitacora-report-card__section-name').hasText('External Section', 'External section is displayed');
    });

    test('it can be configured with custom page size', async function (assert) {
        await render(hbs`<BitacoraReportCard @pageSize={{2}} />`);

        await waitFor('.bitacora-report-card__sections', { timeout: 3000 });

        assert.dom('.bitacora-report-card__section').exists({ count: 2 }, 'Displays 2 sections per page');
        assert.dom('.bitacora-report-card__pagination-info').hasText('1-2 de 5', 'Pagination reflects custom page size');
    });

    test('it refreshes data when refresh button is clicked', async function (assert) {
        let fetchCount = 0;
        this.owner.lookup('service:fetch').get = async () => {
            fetchCount++;
            return {
                sections: [
                    {
                        name: `Section ${fetchCount}`,
                        total_activities: 10,
                        actions: {},
                        trend: 0,
                        trend_direction: 'neutral',
                    },
                ],
            };
        };

        await render(hbs`<BitacoraReportCard />`);

        await waitFor('.bitacora-report-card__sections', { timeout: 3000 });

        assert.dom('.bitacora-report-card__section-name').hasText('Section 1', 'Initial data loaded');

        // Click refresh button
        const refreshButton = this.element.querySelector('.bitacora-report-card__refresh-btn button');
        await click(refreshButton);

        await waitFor('.bitacora-report-card__section-name', { timeout: 3000 });

        assert.dom('.bitacora-report-card__section-name').hasText('Section 2', 'Data refreshed');
    });
});


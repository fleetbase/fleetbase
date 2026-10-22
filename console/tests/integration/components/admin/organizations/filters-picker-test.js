import { module, test } from 'qunit';
import { setupRenderingTest } from '@fleetbase/console/tests/helpers';
import { render, clearRender, click, fillIn } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import AdminOrganizationsFiltersPickerComponent from '@fleetbase/console/components/admin/organizations/filters-picker';
import { captureComponent } from '@fleetbase/console/tests/helpers/capture-component';

module('Integration | Component | admin/organizations/filters-picker', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        this.owner.lookup('service:intl').setLocale('en-us');
        // Rendering setup has already instantiated the router. Patch that instance
        // instead of registering a replacement the container will never look up.
        this.router = this.owner.lookup('service:router');
        this.listeners = new Set();
        this.transitions = [];
        Object.defineProperties(this.router, {
            currentRoute: { configurable: true, writable: true, value: { queryParams: {} } },
            on: { configurable: true, value: (_event, callback) => this.listeners.add(callback) },
            off: { configurable: true, value: (_event, callback) => this.listeners.delete(callback) },
            transitionTo: { configurable: true, value: (...args) => this.transitions.push(args) },
        });
        this.onClear = () => {};
        this.onChange = (...args) => this.owner.lookup('service:filters').set(...args);
        this.onApply = () => {};
        this.captured = captureComponent(this.owner, 'admin/organizations/filters-picker', AdminOrganizationsFiltersPickerComponent);
        this.build = () =>
            render(
                hbs`<Admin::Organizations::FiltersPicker @columns={{this.columns}} @onChange={{this.onChange}} @onApply={{this.onApply}} @onClear={{this.onClear}} @iconOnly={{true}} @renderInPlace={{true}} />`
            );
    });

    test('renders with the Console router and removes its route listener when destroyed', async function (assert) {
        await this.build();
        assert.strictEqual(this.captured.instance.activeRouter, this.router, 'no engine host-router service is required');
        assert.dom('button').exists();
        assert.strictEqual(this.listeners.size, 1);
        await clearRender();
        assert.strictEqual(this.listeners.size, 0);
    });

    test('opening the picker reads current filter values including explicit false and zero', async function (assert) {
        this.columns = [
            { label: 'Owner email', valuePath: 'owner_uuid', filterParam: 'owner_email', filterable: true, filterComponent: 'filter/string' },
            { label: 'Onboarding', valuePath: 'onboarding_completed', filterable: true, filterComponent: 'filter/string' },
            { label: 'Zero', valuePath: 'zero', filterable: true, filterComponent: 'filter/string' },
            { label: 'Unset', valuePath: 'unset', filterable: true, filterComponent: 'filter/string' },
            { label: 'Cleared', valuePath: 'cleared', filterable: true, filterComponent: 'filter/string' },
            { label: 'Empty', valuePath: 'empty', filterable: true, filterComponent: 'filter/string' },
            { label: 'Users', valuePath: 'users_count', filterable: false },
        ];
        this.router.currentRoute.queryParams = { owner_email: 'owner@example.com', onboarding_completed: false, zero: 0, cleared: null, empty: '' };
        await this.build();
        const component = this.captured.instance;
        component.filterState.pendingQueryParams = { country: 'US' };
        component.updateFilters();
        assert.deepEqual(component.filterState.pendingQueryParams, {}, 'opening discards unapplied filters that are no longer displayed');

        assert.strictEqual(component.filters.length, 6, 'non-filterable columns are excluded');
        assert.deepEqual(
            component.activeFilters.map(({ param, filterValue }) => ({ param, filterValue })),
            [
                { param: 'owner_email', filterValue: 'owner@example.com' },
                { param: 'onboarding_completed', filterValue: false },
                { param: 'zero', filterValue: 0 },
            ]
        );

        this.router.currentRoute.queryParams = { owner_email: 'updated@example.com' };
        component.updateFilters();
        assert.strictEqual(component.filters[0].filterValue, 'updated@example.com', 'reopening reflects changes made outside the picker');
        assert.strictEqual(component.activeFilters.length, 1);
    });

    test('handles missing route state and omitted columns while routes initialize', async function (assert) {
        this.router.currentRoute = undefined;
        await this.build();
        this.captured.instance.updateFilters();
        assert.deepEqual(this.captured.instance.filters, []);

        this.router.currentRoute = {};
        this.captured.instance.updateFilters();
        assert.deepEqual(this.captured.instance.activeFilters, []);
    });

    test('applying a filter preserves pending values while the dropdown closes', async function (assert) {
        this.columns = [{ label: 'Organization name', valuePath: 'name', filterable: true, filterComponent: 'filter/string' }];
        let applied;
        this.onApply = () => {
            applied = { ...this.owner.lookup('service:filters').pendingQueryParams };
        };
        await this.build();
        await click('button');
        await fillIn('.filter-string input', 'Acme');
        await click('.filters-dropdown-footer button.btn-primary');

        assert.deepEqual(applied, { name: 'Acme' }, 'Apply receives the entered value after its close handler has run');
        await click('button');
        assert.deepEqual(this.owner.lookup('service:filters').pendingQueryParams, {}, 'reopening discards values from the previous picker session');
    });

    test('clearing delegates once without restoring stale search or saved-view parameters', async function (assert) {
        this.router.currentRoute.queryParams = { query: 'Acme', needs_attention: '1', owner_email: 'owner@example.com' };
        let clears = 0;
        this.onClear = () => {
            clears++;
        };
        await this.build();
        this.captured.instance.clearFilters();

        assert.strictEqual(clears, 1, 'the controller owns the reset');
        assert.deepEqual(this.transitions, [], 'the picker never starts a second transition with the old query params');
    });
});

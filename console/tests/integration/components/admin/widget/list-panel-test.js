import { module, test } from 'qunit';
import { setupRenderingTest } from '@fleetbase/console/tests/helpers';
import { render, click } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import Service from '@ember/service';
import AdminWidgetListPanelComponent from '@fleetbase/console/components/admin/widget/list-panel';
import { captureComponent } from '@fleetbase/console/tests/helpers/capture-component';

module('Integration | Component | admin/widget/list-panel', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        const self = this;
        this.requested = [];
        this.getResponse = () =>
            Promise.resolve({
                title: 'Needs Attention',
                items: [
                    // the template renders item.title, not item.label
                    { title: 'First', route: 'console.admin.organizations.details', routeModels: ['org_1'], queryParams: { tab: 'users' } },
                    { title: 'Second' },
                ],
            });

        class FetchStub extends Service {
            get(path) {
                self.requested.push(path);
                return self.getResponse();
            }
        }
        this.owner.register('service:fetch', FetchStub);

        this.transitions = [];
        const router = this.owner.lookup('service:router');
        Object.defineProperty(router, 'transitionTo', {
            configurable: true,
            value: (...args) => {
                this.transitions.push(args);
                return Promise.resolve();
            },
        });

        this.renderPanel = (options = {}) => {
            this.set('options', options);
            return render(hbs`<Admin::Widget::ListPanel @options={{this.options}} />`);
        };
    });

    test('it loads its widget data from the slug endpoint', async function (assert) {
        await this.renderPanel({ slug: 'stale-orgs' });

        assert.deepEqual(this.requested, ['metrics/admin/widgets/stale-orgs']);
        assert.dom(this.element).containsText('Needs Attention', 'the title from the payload is shown');
        assert.dom(this.element).containsText('First');
        assert.dom(this.element).containsText('Second');
    });

    test('it refuses to load without a slug', async function (assert) {
        await this.renderPanel({});

        assert.deepEqual(this.requested, [], 'nothing is requested');
        assert.dom(this.element).containsText('Missing dashboard widget slug.');
    });

    test('a failed load shows the error, and falls back without a message', async function (assert) {
        this.getResponse = () => Promise.reject(new Error('upstream down'));
        await this.renderPanel({ slug: 's' });
        assert.dom(this.element).containsText('upstream down');

        this.getResponse = () => Promise.reject({});
        await this.renderPanel({ slug: 's' });
        assert.dom(this.element).containsText('Unable to load dashboard widget.');
    });

    test('title, subtitle and icon prefer options over the payload', async function (assert) {
        await this.renderPanel({ slug: 's', title: 'From Options', subtitle: 'sub' });

        assert.dom(this.element).containsText('From Options');
        assert.dom(this.element).containsText('sub');
        assert.dom(this.element).doesNotContainText('Needs Attention', 'the payload title is overridden');
    });

    test('an empty payload shows the empty state, and a custom one when supplied', async function (assert) {
        this.getResponse = () => Promise.resolve({ items: [] });
        await this.renderPanel({ slug: 's' });
        assert.dom(this.element).containsText('No items require attention.', 'the default empty text');

        this.getResponse = () => Promise.resolve({ items: [], empty: 'Nothing to see' });
        await this.renderPanel({ slug: 's' });
        assert.dom(this.element).containsText('Nothing to see');
    });

    test('clicking an item with a route transitions with its models and query params', async function (assert) {
        await this.renderPanel({ slug: 's' });

        const itemButtons = [...this.element.querySelectorAll('button')].filter((b) => /First|Second/.test(b.textContent));
        await click(itemButtons[0]);

        assert.deepEqual(this.transitions.at(-1), ['console.admin.organizations.details', 'org_1', { queryParams: { tab: 'users' } }]);
    });

    test('an item without a route is disabled and does not transition', async function (assert) {
        await this.renderPanel({ slug: 's' });

        const second = [...this.element.querySelectorAll('button')].find((b) => /Second/.test(b.textContent));
        assert.dom(second).isDisabled('an item with no route cannot be clicked');

        // calling the handler directly proves the guard, since the button is disabled
        assert.deepEqual(this.transitions, [], 'nothing has transitioned');
    });

    test('the drilldown transitions using the payload route and query params', async function (assert) {
        this.getResponse = () => Promise.resolve({ items: [], route: 'console.admin.organizations', queryParams: { needs_attention: 1 } });

        await this.renderPanel({ slug: 's' });
        const drilldown = [...this.element.querySelectorAll('button')].at(-1);
        await click(drilldown);

        assert.deepEqual(this.transitions.at(-1), ['console.admin.organizations', { queryParams: { needs_attention: 1 } }]);
    });

    test('the drilldown falls back to the options route', async function (assert) {
        this.getResponse = () => Promise.resolve({ items: [] });

        await this.renderPanel({ slug: 's', route: 'console.admin.index', queryParams: { from: 'widget' } });
        const drilldown = [...this.element.querySelectorAll('button')].at(-1);
        await click(drilldown);

        assert.deepEqual(this.transitions.at(-1), ['console.admin.index', { queryParams: { from: 'widget' } }]);
    });

    test('the refresh button reloads the widget', async function (assert) {
        await this.renderPanel({ slug: 's' });
        assert.strictEqual(this.requested.length, 1);

        const refresh = this.element.querySelector('button');
        await click(refresh);

        assert.strictEqual(this.requested.length, 2, 'the endpoint is requested again');
    });
});

/**
 * The panel's getters all fall back through options -> loaded data -> a default, and its
 * drilldown handlers are bound to click targets that only exist when data is present.
 */
module('Integration | Component | admin/widget/list-panel | behaviour', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        this.getResponse = {};
        this.getRejectsWith = null;
        const context = this;

        class FetchStub extends Service {
            async get() {
                if (context.getRejectsWith) {
                    throw context.getRejectsWith;
                }

                return context.getResponse;
            }
        }
        this.owner.register('service:fetch', FetchStub);

        const captured = captureComponent(this.owner, 'admin/widget/list-panel', AdminWidgetListPanelComponent);
        this.build = async () => {
            await render(hbs`<Admin::Widget::ListPanel @options={{this.options}} />`);
            const component = captured.instance;

            this.transitions = [];
            Object.defineProperty(component.router, 'transitionTo', {
                configurable: true,
                value: (...args) => {
                    this.transitions.push(args);
                    return 'transition';
                },
            });

            return component;
        };
    });

    test('a widget with no slug reports the misconfiguration instead of requesting', async function (assert) {
        this.set('options', {});
        const component = await this.build();

        assert.strictEqual(component.error, 'Missing dashboard widget slug.');
        assert.strictEqual(component.data, null);
    });

    test('the panel falls back through options, loaded data and defaults', async function (assert) {
        this.getResponse = { title: 'From data', subtitle: 'Data subtitle', icon: 'chart', items: [{ id: 1 }], empty: 'Nothing here' };
        this.set('options', { slug: 'attention' });
        const component = await this.build();

        assert.strictEqual(component.title, 'From data', 'the loaded title is used when options omit one');
        assert.strictEqual(component.subtitle, 'Data subtitle');
        assert.strictEqual(component.icon, 'chart');
        assert.deepEqual(component.items, [{ id: 1 }]);
        assert.strictEqual(component.emptyText, 'Nothing here');
        assert.strictEqual(component.endpoint, 'metrics/admin/widgets/attention');
    });

    test('options win over the loaded data', async function (assert) {
        this.getResponse = { title: 'From data', subtitle: 'Data subtitle', icon: 'chart' };
        this.set('options', { slug: 'attention', title: 'From options', subtitle: 'Options subtitle', icon: 'flag' });
        const component = await this.build();

        assert.strictEqual(component.title, 'From options');
        assert.strictEqual(component.subtitle, 'Options subtitle');
        assert.strictEqual(component.icon, 'flag');
    });

    test('an empty widget falls back to its built-in labels', async function (assert) {
        this.set('options', { slug: 'attention' });
        const component = await this.build();

        assert.strictEqual(component.title, 'Admin Summary');
        assert.strictEqual(component.subtitle, undefined);
        assert.strictEqual(component.icon, 'list');
        assert.deepEqual(component.items, []);
        assert.strictEqual(component.emptyText, 'No items require attention.');
        assert.false(component.hasDrilldown, 'with no route there is nothing to drill into');
    });

    test('a failed load records the error message', async function (assert) {
        this.getRejectsWith = new Error('widget endpoint down');
        this.set('options', { slug: 'attention' });
        const component = await this.build();

        assert.strictEqual(component.error, 'widget endpoint down');
    });

    test('a failure with no message falls back to a generic one', async function (assert) {
        this.getRejectsWith = {};
        this.set('options', { slug: 'attention' });
        const component = await this.build();

        assert.strictEqual(component.error, 'Unable to load dashboard widget.');
    });

    test('openItem transitions with the models and query params on the item', async function (assert) {
        this.set('options', { slug: 'attention' });
        const component = await this.build();

        component.openItem({ route: 'console.admin.users', routeModels: ['abc'], queryParams: { status: 'active' } });

        assert.deepEqual(this.transitions, [['console.admin.users', 'abc', { queryParams: { status: 'active' } }]]);
    });

    test('openItem defaults the models and query params when the item omits them', async function (assert) {
        this.set('options', { slug: 'attention' });
        const component = await this.build();

        component.openItem({ route: 'console.admin.users' });

        assert.deepEqual(this.transitions, [['console.admin.users', { queryParams: {} }]]);
    });

    test('openItem ignores an item with no route', async function (assert) {
        this.set('options', { slug: 'attention' });
        const component = await this.build();

        assert.strictEqual(component.openItem({}), undefined);
        assert.strictEqual(component.openItem(undefined), undefined, 'a missing item is handled too');
        assert.deepEqual(this.transitions, [], 'nothing navigates');
    });

    test('openDrilldown uses the loaded route and query params', async function (assert) {
        this.getResponse = { route: 'console.admin.organizations', queryParams: { attention: true } };
        this.set('options', { slug: 'attention' });
        const component = await this.build();

        assert.true(component.hasDrilldown);
        component.openDrilldown();

        assert.deepEqual(this.transitions, [['console.admin.organizations', { queryParams: { attention: true } }]]);
    });

    test('openDrilldown falls back to the options route and an empty query', async function (assert) {
        this.set('options', { slug: 'attention', route: 'console.admin.users' });
        const component = await this.build();

        component.openDrilldown();

        assert.deepEqual(this.transitions, [['console.admin.users', { queryParams: {} }]]);
    });

    test('openDrilldown does nothing when no route is configured', async function (assert) {
        this.set('options', { slug: 'attention' });
        const component = await this.build();

        assert.strictEqual(component.openDrilldown(), undefined);
        assert.deepEqual(this.transitions, []);
    });
});

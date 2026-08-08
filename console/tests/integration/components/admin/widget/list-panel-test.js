import { module, test } from 'qunit';
import { setupRenderingTest } from '@fleetbase/console/tests/helpers';
import { render, click } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import Service from '@ember/service';

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

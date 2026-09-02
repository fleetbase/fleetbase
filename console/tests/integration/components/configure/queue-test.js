import { module, test } from 'qunit';
import { setupRenderingTest } from '@fleetbase/console/tests/helpers';
import { render, click } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import Service from '@ember/service';
import { captureComponent } from '@fleetbase/console/tests/helpers/capture-component';
import ConfigureQueueComponent from '@fleetbase/console/components/configure/queue';

/**
 * Lets the fire-and-forget promise chains the component starts run to completion. They are
 * native promises, so settled() does not track them.
 */
function flush() {
    return new Promise((resolve) => setTimeout(resolve, 0));
}

module('Integration | Component | configure/queue', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        this.posted = [];
        this.getResponse = { driver: 'redis' };
        this.postResponse = { status: 'ok' };
        const context = this;

        class FetchStub extends Service {
            get() {
                return Promise.resolve(context.getResponse);
            }
            post(path, payload) {
                context.posted.push({ path, payload });
                return Promise.resolve(context.postResponse);
            }
        }
        class NotificationsStub extends Service {
            successes = [];
            success(message) {
                this.successes.push(message);
            }
            error() {}
            serverError() {}
        }

        this.owner.register('service:fetch', FetchStub);
        this.owner.register('service:notifications', NotificationsStub);

        // Glimmer components cannot be constructed by hand, so let Ember build one and
        // capture it: the actions below are only reachable through third-party controls
        // in the template, or not rendered at all.
        const captured = captureComponent(this.owner, 'configure/queue', ConfigureQueueComponent);
        this.build = async () => {
            await render(hbs`
                <div id="next-view-section-subheader-actions"></div>
                <Configure::Queue />
            `);
            await flush();
            return captured.instance;
        };
    });

    test('it renders the queue panel and wormholes its save button to the subheader', async function (assert) {
        await render(hbs`
            <div id="next-view-section-subheader-actions"></div>
            <Configure::Queue />
        `);

        assert.dom('.next-content-panel').exists('the panel renders');
        assert.dom(this.element).containsText('Queue');
        assert.dom('#next-view-section-subheader-actions').containsText('Save Changes', 'the save button is wormholed into the subheader');
    });

    test('it saves the queue configuration when the wormholed button is clicked', async function (assert) {
        await render(hbs`
            <div id="next-view-section-subheader-actions"></div>
            <Configure::Queue />
        `);

        await click('#next-view-section-subheader-actions button');

        assert.strictEqual(this.posted.at(-1).path, 'settings/queue-config');
    });

    test('it defaults to the sync driver with beanstalkd pointed at localhost', async function (assert) {
        this.getResponse = {};
        const component = await this.build();

        assert.strictEqual(component.driver, 'sync');
        assert.deepEqual(component.connections, []);
        // Read before anything writes them: a @tracked field's initializer only runs on
        // first access, so a test that assigns first never evaluates it.
        assert.strictEqual(component.testResponse, undefined, 'no connection test has run yet');
        assert.strictEqual(component.sqsQueue, null);
        assert.strictEqual(component.sqsSuffix, null);
        assert.strictEqual(component.sqsPrefix, null);
        assert.strictEqual(component.beanstalkdHost, 'localhost');
        assert.strictEqual(component.beanstalkdQueue, 'default');
        assert.false(component.isLoading);
    });

    test('loadConfigValues applies known keys and ignores unknown ones', async function (assert) {
        this.getResponse = { driver: 'sqs', sqsQueue: 'jobs', notAFieldOnThisComponent: 'ignored' };
        const component = await this.build();

        assert.strictEqual(component.driver, 'sqs');
        assert.strictEqual(component.sqsQueue, 'jobs');
        assert.strictEqual(component.notAFieldOnThisComponent, undefined, 'keys the component does not declare are dropped');
    });

    test('setDriver swaps the active driver', async function (assert) {
        const component = await this.build();

        component.setDriver('beanstalkd');

        assert.strictEqual(component.driver, 'beanstalkd');
    });

    test('save posts the sqs and beanstalkd settings and reports success', async function (assert) {
        this.getResponse = {};
        const component = await this.build();

        component.setDriver('sqs');
        component.sqsPrefix = 'https://sqs.example.com/1';
        component.sqsQueue = 'jobs';
        component.sqsSuffix = '-staging';

        component.save();
        assert.true(component.isLoading, 'the panel is busy while saving');
        await flush();

        const { path, payload } = this.posted.at(-1);
        assert.strictEqual(path, 'settings/queue-config');
        assert.strictEqual(payload.driver, 'sqs');
        assert.deepEqual(payload.sqs, { prefix: 'https://sqs.example.com/1', queue: 'jobs', suffix: '-staging' });
        assert.deepEqual(payload.beanstalkd, { host: 'localhost', queue: 'default' });
        assert.deepEqual(this.owner.lookup('service:notifications').successes, ['Queue configuration saved.']);
        assert.false(component.isLoading);
    });

    test('test posts the selected queue and keeps the response', async function (assert) {
        const component = await this.build();

        component.setDriver('beanstalkd');
        component.test();
        await flush();

        assert.deepEqual(this.posted.at(-1), { path: 'settings/test-queue-config', payload: { queue: 'beanstalkd' } });
        assert.deepEqual(component.testResponse, this.postResponse);
        assert.false(component.isLoading);
    });
});

module('Integration | Component | configure/queue | defaults', function (hooks) {
    setupRenderingTest(hooks);

    test('a server that reports no connections leaves the picker empty rather than undefined', async function (assert) {
        class FetchStub extends Service {
            async get() {
                return { driver: 'sync' };
            }
            async post() {
                return {};
            }
        }
        class NotificationsStub extends Service {
            success() {}
            serverError() {}
        }
        this.owner.register('service:fetch', FetchStub);
        this.owner.register('service:notifications', NotificationsStub);

        const captured = captureComponent(this.owner, 'configure/queue', ConfigureQueueComponent);
        await render(hbs`<div id="next-view-section-subheader-actions"></div><Configure::Queue />`);

        assert.deepEqual(captured.instance.connections, [], 'the connection list defaults to empty');
        assert.strictEqual(captured.instance.beanstalkdHost, 'localhost', 'and the shipped beanstalkd defaults survive');
        assert.strictEqual(captured.instance.beanstalkdQueue, 'default');
    });
});

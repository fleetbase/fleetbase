import { module, test } from 'qunit';
import { setupRenderingTest } from '@fleetbase/console/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | onboarding/yield', function (hooks) {
    setupRenderingTest(hooks);

    test('it renders a spinner until initialization completes', async function (assert) {
        await render(hbs`<Onboarding::Yield />`);

        assert.dom('.onboarding.step-host').exists('the step host renders');
    });

    test('it sends the requested step to the orchestrator', async function (assert) {
        const orchestrator = this.owner.lookup('service:onboarding-orchestrator');

        let wentTo;
        Object.defineProperty(orchestrator, 'goto', {
            configurable: true,
            value: (step) => {
                wentTo = step;
                return Promise.resolve();
            },
        });

        await render(hbs`<Onboarding::Yield @step="verify-email" />`);

        assert.strictEqual(wentTo, 'verify-email');
    });

    test('it persists the session and code into the onboarding context', async function (assert) {
        const orchestrator = this.owner.lookup('service:onboarding-orchestrator');
        Object.defineProperty(orchestrator, 'goto', { configurable: true, value: () => Promise.resolve() });

        const context = this.owner.lookup('service:onboarding-context');

        await render(hbs`<Onboarding::Yield @session="sess_1" @code="123456" />`);

        assert.strictEqual(context.get('session'), 'sess_1', 'the session is persisted');
        assert.strictEqual(context.get('code'), '123456', 'the code is stored');
    });
});

import { module, test } from 'qunit';
import { setupRenderingTest } from '@fleetbase/console/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import Component from '@glimmer/component';
import { setComponentTemplate } from '@ember/component';
import OnboardingYieldComponent from '@fleetbase/console/components/onboarding/yield';
import { captureComponent } from '@fleetbase/console/tests/helpers/capture-component';

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

module('Integration | Component | onboarding/yield | current step', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        // A stand-in for whatever step an onboarding flow registers. The real step
        // components pull in the verification service, which schedules a 75-second timer
        // that would hold settled() open for the whole test timeout.
        this.owner.register('component:test-onboarding-step', setComponentTemplate(hbs`<div class="test-onboarding-step"></div>`, class extends Component {}));
    });

    test('the component of the orchestrator current step is what gets rendered', async function (assert) {
        const orchestrator = this.owner.lookup('service:onboarding-orchestrator');
        Object.defineProperty(orchestrator, 'goto', { configurable: true, value: () => Promise.resolve() });
        Object.defineProperty(orchestrator, 'current', {
            configurable: true,
            value: { id: 'verify-email', component: 'test-onboarding-step' },
        });

        const captured = captureComponent(this.owner, 'onboarding/yield', OnboardingYieldComponent);
        await render(hbs`<Onboarding::Yield @step="verify-email" />`);

        assert.strictEqual(captured.instance.currentComponent, 'test-onboarding-step');
        assert.dom('.test-onboarding-step').exists('and it is what the step host renders');
    });

    test('there is nothing to render before the orchestrator has a current step', async function (assert) {
        const orchestrator = this.owner.lookup('service:onboarding-orchestrator');
        Object.defineProperty(orchestrator, 'goto', { configurable: true, value: () => Promise.resolve() });
        Object.defineProperty(orchestrator, 'current', { configurable: true, value: null });

        const captured = captureComponent(this.owner, 'onboarding/yield', OnboardingYieldComponent);
        await render(hbs`<Onboarding::Yield />`);

        assert.strictEqual(captured.instance.currentComponent, null);
    });
});

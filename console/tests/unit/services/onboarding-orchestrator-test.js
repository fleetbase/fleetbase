import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';

// Register a flow on the real onboarding-registry singleton the orchestrator injects.
// Using the real registry (rather than a stub) exercises the true production wiring;
// stubbing `service:onboarding-registry` via owner.register does not reliably override
// the injected instance here.
function registerFlow(owner, flow) {
    owner.lookup('service:onboarding-registry').registerFlow(flow, { default: true });
}

/**
 * Replaces a localStorage method with one that throws, the way a private-browsing or
 * quota-exhausted browser behaves. Storage methods live on Storage.prototype, so an own
 * property on the instance shadows them until it is deleted.
 */
function breakStorage(method) {
    Object.defineProperty(window.localStorage, method, {
        configurable: true,
        value() {
            throw new Error('QuotaExceededError');
        },
    });

    return () => delete window.localStorage[method];
}

module('Unit | Service | onboarding-orchestrator', function (hooks) {
    setupTest(hooks);

    test('start throws for an unknown flow', async function (assert) {
        const service = this.owner.lookup('service:onboarding-orchestrator');
        await assert.rejects(service.start('missing'), /not found/);
    });

    test('start enters the entry step, next advances then completes the flow', async function (assert) {
        registerFlow(this.owner, { id: 'f', entry: 'a', steps: [{ id: 'a', next: 'b' }, { id: 'b' }] });
        const service = this.owner.lookup('service:onboarding-orchestrator');

        await service.start('f');
        assert.strictEqual(service.current.id, 'a', 'entered entry step');

        await service.next();
        assert.strictEqual(service.current.id, 'b', 'advanced to next step');

        await service.next();
        assert.strictEqual(service.current, null, 'flow complete');
    });

    test('goto throws for an unknown step', async function (assert) {
        registerFlow(this.owner, { id: 'g', entry: 'a', steps: [{ id: 'a', next: 'b' }, { id: 'b' }] });
        const service = this.owner.lookup('service:onboarding-orchestrator');
        await service.start('g');
        await assert.rejects(service.goto('nope'), /not found/);
    });

    test('next supports a function next() and runs lifecycle hooks', async function (assert) {
        const calls = [];
        registerFlow(this.owner, {
            id: 'h',
            entry: 'a',
            steps: [
                { id: 'a', next: () => 'b', afterLeave: () => calls.push('afterLeave:a') },
                { id: 'b', beforeEnter: () => calls.push('beforeEnter:b') },
            ],
        });
        const service = this.owner.lookup('service:onboarding-orchestrator');

        await service.start('h');
        await service.next();

        assert.strictEqual(service.current.id, 'b');
        assert.deepEqual(calls, ['afterLeave:a', 'beforeEnter:b']);
    });

    test('back returns to the previous step', async function (assert) {
        registerFlow(this.owner, { id: 'i', entry: 'a', steps: [{ id: 'a', next: 'b' }, { id: 'b' }] });
        const service = this.owner.lookup('service:onboarding-orchestrator');

        await service.start('i');
        await service.next();
        await service.back();

        assert.strictEqual(service.current.id, 'a');
    });

    test('it starts out idle with no flow and a default history key', function (assert) {
        const service = this.owner.lookup('service:onboarding-orchestrator');

        // Reads every tracked default before a flow assigns over it.
        assert.strictEqual(service.flow, null);
        assert.strictEqual(service.current, null);
        assert.strictEqual(service.sessionId, null);
        assert.deepEqual(service.history, []);
        assert.strictEqual(service.historyStorageKey, 'onboarding:history:default', 'the key falls back to "default" with no flow loaded');
    });

    test('start with no arguments uses the registry default flow', async function (assert) {
        registerFlow(this.owner, { id: 'registry-default', entry: 'a', steps: [{ id: 'a' }] });
        const service = this.owner.lookup('service:onboarding-orchestrator');

        await service.start();

        assert.strictEqual(service.flow.id, 'registry-default');
        assert.strictEqual(service.current.id, 'a');
        assert.strictEqual(service.sessionId, null, 'no session id was supplied');
        assert.strictEqual(service.historyStorageKey, 'onboarding:history:registry-default');
    });

    test('start records the session id and the flow wrapper', async function (assert) {
        registerFlow(this.owner, { id: 'w', entry: 'a', wrapper: 'onboarding/shell', steps: [{ id: 'a' }] });
        const service = this.owner.lookup('service:onboarding-orchestrator');

        await service.start('w', { sessionId: 'sess-1' });

        assert.strictEqual(service.wrapper, 'onboarding/shell');
        assert.strictEqual(service.sessionId, 'sess-1');
    });

    test('start runs the flow-level start hooks around the entry step', async function (assert) {
        const calls = [];
        registerFlow(this.owner, {
            id: 'hooks',
            entry: 'a',
            steps: [{ id: 'a' }],
            onFlowWillStart(flow, orchestrator) {
                calls.push(['willStart', flow.id, orchestrator.current]);
            },
            onFlowDidStart(flow, orchestrator) {
                calls.push(['didStart', flow.id, orchestrator.current?.id]);
            },
        });
        const service = this.owner.lookup('service:onboarding-orchestrator');

        await service.start('hooks');

        assert.deepEqual(calls, [
            ['willStart', 'hooks', null],
            ['didStart', 'hooks', 'a'],
        ]);
    });

    test('goto runs the step-change hooks with the outgoing and incoming steps', async function (assert) {
        const calls = [];
        registerFlow(this.owner, {
            id: 'sc',
            entry: 'a',
            steps: [{ id: 'a', next: 'b' }, { id: 'b' }],
            onStepWillChange(step, previous) {
                calls.push(['will', step.id, previous?.id ?? null]);
            },
            onStepDidChange(step, previous) {
                calls.push(['did', step.id, previous?.id ?? null]);
            },
        });
        const service = this.owner.lookup('service:onboarding-orchestrator');

        await service.start('sc');
        await service.next();

        assert.deepEqual(calls, [
            ['will', 'a', null],
            ['did', 'a', null],
            ['will', 'b', 'a'],
            ['did', 'b', 'a'],
        ]);
    });

    test('goto skips a step whose guard rejects the current context', async function (assert) {
        registerFlow(this.owner, {
            id: 'guarded',
            entry: 'a',
            steps: [{ id: 'a', next: 'b' }, { id: 'b', next: 'c', guard: () => false }, { id: 'c' }],
        });
        const service = this.owner.lookup('service:onboarding-orchestrator');

        await service.start('guarded');
        await service.next();

        assert.strictEqual(service.current.id, 'c', 'the guarded step is skipped straight through to its own next');
        assert.deepEqual(
            service.history.map((step) => step.id),
            ['a'],
            'a step that was never entered is not recorded in history'
        );
    });

    test('a skipped step resolves a function next() to find where to go', async function (assert) {
        registerFlow(this.owner, {
            id: 'guarded-fn',
            entry: 'a',
            steps: [{ id: 'a', next: 'b' }, { id: 'b', guard: () => false, next: () => 'c' }, { id: 'c' }],
        });
        const service = this.owner.lookup('service:onboarding-orchestrator');

        await service.start('guarded-fn');
        await service.next();

        assert.strictEqual(service.current.id, 'c');
    });

    test('skipping the last step completes the flow', async function (assert) {
        const ended = [];
        registerFlow(this.owner, {
            id: 'guarded-last',
            entry: 'a',
            steps: [
                { id: 'a', next: 'b' },
                { id: 'b', guard: () => false },
            ],
            onFlowWillEnd(step) {
                ended.push(step.id);
            },
        });
        const service = this.owner.lookup('service:onboarding-orchestrator');

        await service.start('guarded-last');
        await service.next();

        assert.strictEqual(service.current, null, 'a guarded final step ends the flow rather than looping');
        assert.deepEqual(ended, ['b'], 'the skipped step is reported as the one the flow ended on');
    });

    test('consecutive guarded steps are skipped without recursing on the previous step', async function (assert) {
        registerFlow(this.owner, {
            id: 'guarded-chain',
            entry: 'a',
            steps: [{ id: 'a', next: 'b' }, { id: 'b', next: 'c', guard: () => false }, { id: 'c', next: 'd', guard: () => false }, { id: 'd' }],
        });
        const service = this.owner.lookup('service:onboarding-orchestrator');

        await service.start('guarded-chain');
        await service.next();

        assert.strictEqual(service.current.id, 'd', 'both guarded steps are stepped over in one move');
    });

    test('a guard receives the onboarding context', async function (assert) {
        let received;
        registerFlow(this.owner, {
            id: 'guard-ctx',
            entry: 'a',
            steps: [
                { id: 'a', next: 'b' },
                {
                    id: 'b',
                    guard: (context) => {
                        received = context;
                        return true;
                    },
                },
            ],
        });
        const service = this.owner.lookup('service:onboarding-orchestrator');

        await service.start('guard-ctx');
        await service.next();

        assert.strictEqual(received, this.owner.lookup('service:onboarding-context'), 'the real context service is handed to the guard');
        assert.strictEqual(service.current.id, 'b', 'a passing guard does not skip the step');
    });

    test('goto refuses to run before a flow is started', async function (assert) {
        const service = this.owner.lookup('service:onboarding-orchestrator');

        await assert.rejects(service.goto('a'), /No active onboarding flow/);
    });

    test('next is a no-op when no flow is active', async function (assert) {
        const service = this.owner.lookup('service:onboarding-orchestrator');

        assert.strictEqual(await service.next(), undefined, 'returns without touching state');
        assert.strictEqual(service.current, null);
    });

    test('next does not record the same step in history twice', async function (assert) {
        registerFlow(this.owner, {
            id: 'loop',
            entry: 'a',
            steps: [
                { id: 'a', next: 'b' },
                { id: 'b', next: 'a' },
            ],
        });
        const service = this.owner.lookup('service:onboarding-orchestrator');

        await service.start('loop');
        await service.next();
        await service.next();

        assert.strictEqual(service.current.id, 'a', 'the flow looped back round');
        assert.deepEqual(
            service.history.map((step) => step.id),
            ['a', 'b'],
            'history holds each step once'
        );

        await service.next();

        assert.deepEqual(
            service.history.map((step) => step.id),
            ['a', 'b'],
            'revisiting a step does not duplicate the entry'
        );
    });

    test('completing a flow runs the end hooks and clears persisted history', async function (assert) {
        const calls = [];
        registerFlow(this.owner, {
            id: 'ending',
            entry: 'a',
            steps: [{ id: 'a' }],
            onFlowWillEnd(step, orchestrator) {
                calls.push(['willEnd', step.id, orchestrator.current?.id]);
            },
            onFlowDidEnd(step, orchestrator) {
                calls.push(['didEnd', step.id, orchestrator.current]);
            },
        });
        const service = this.owner.lookup('service:onboarding-orchestrator');

        await service.start('ending');
        assert.strictEqual(window.localStorage.getItem('onboarding:history:ending'), null, 'precondition: nothing persisted yet');

        await service.next();

        assert.deepEqual(calls, [
            ['willEnd', 'a', 'a'],
            ['didEnd', 'a', null],
        ]);
        assert.strictEqual(service.current, null, 'the flow is finished');
        assert.strictEqual(window.localStorage.getItem('onboarding:history:ending'), null, 'history is cleared on completion');
    });

    test('back is a no-op with no flow or an empty history', async function (assert) {
        const service = this.owner.lookup('service:onboarding-orchestrator');
        assert.strictEqual(await service.back(), undefined, 'no flow at all');

        registerFlow(this.owner, { id: 'nb', entry: 'a', steps: [{ id: 'a', next: 'b' }, { id: 'b' }] });
        await service.start('nb');

        await service.back();

        assert.strictEqual(service.current.id, 'a', 'nothing to go back to, so we stay put');
    });

    test('back refuses to leave a step that disallows it', async function (assert) {
        registerFlow(this.owner, {
            id: 'noback',
            entry: 'a',
            steps: [{ id: 'a', next: 'b', allowBack: false }, { id: 'b' }],
        });
        const service = this.owner.lookup('service:onboarding-orchestrator');

        await service.start('noback');
        await service.next();
        assert.strictEqual(service.current.id, 'b');

        await service.back();

        assert.strictEqual(service.current.id, 'b', 'the step marked allowBack: false is not returned to');
        assert.strictEqual(service.history.length, 1, 'and history is left intact');
    });

    test('getCurrentPath returns null for a flow without paths', async function (assert) {
        const service = this.owner.lookup('service:onboarding-orchestrator');
        assert.strictEqual(service.getCurrentPath(), null, 'no flow at all');

        registerFlow(this.owner, { id: 'np', entry: 'a', steps: [{ id: 'a' }] });
        await service.start('np');

        assert.strictEqual(service.getCurrentPath(), null, 'a flow with no paths defined');
    });

    test('getCurrentPath finds the path containing the current step', async function (assert) {
        const driver = { steps: [{ id: 'b' }] };
        registerFlow(this.owner, {
            id: 'paths',
            entry: 'a',
            steps: [{ id: 'a', next: 'b' }, { id: 'b' }],
            paths: { empty: {}, driver },
        });
        const service = this.owner.lookup('service:onboarding-orchestrator');

        await service.start('paths');
        assert.strictEqual(service.getCurrentPath(), null, 'step a belongs to no declared path');

        await service.next();

        assert.strictEqual(service.getCurrentPath(), driver, 'step b resolves to the driver path');
    });

    test('isStepInPath allows everything when the flow declares no paths', async function (assert) {
        registerFlow(this.owner, { id: 'isp-none', entry: 'a', steps: [{ id: 'a' }] });
        const service = this.owner.lookup('service:onboarding-orchestrator');
        await service.start('isp-none');

        assert.true(service.isStepInPath('anything'), 'with no path context every step is valid');
    });

    test('isStepInPath is limited to the steps of the active path', async function (assert) {
        registerFlow(this.owner, {
            id: 'isp',
            entry: 'a',
            steps: [{ id: 'a' }, { id: 'b' }],
            paths: { main: { steps: [{ id: 'a' }] } },
        });
        const service = this.owner.lookup('service:onboarding-orchestrator');
        await service.start('isp');

        assert.true(service.isStepInPath('a'), 'a is in the active path');
        assert.false(service.isStepInPath('b'), 'b is not');
    });

    test('isStepInPath rejects every step when the active path lists none', async function (assert) {
        registerFlow(this.owner, {
            id: 'isp-empty',
            entry: 'a',
            steps: [{ id: 'a' }],
            paths: { main: { steps: [{ id: 'a' }] } },
        });
        const service = this.owner.lookup('service:onboarding-orchestrator');
        await service.start('isp-empty');

        // getCurrentPath() only ever returns a path that already matched on `pathDef.steps`,
        // so a truthy path with no steps array cannot arise through the public API. Stub the
        // lookup directly to pin down what isStepInPath() does if one ever did.
        Object.defineProperty(service, 'getCurrentPath', { configurable: true, value: () => ({}) });

        assert.false(service.isStepInPath('a'), 'a path with no steps admits nothing');
    });

    test('history is persisted as step ids and restored on resume', async function (assert) {
        const flow = { id: 'resume', entry: 'a', steps: [{ id: 'a', next: 'b' }, { id: 'b', next: 'c' }, { id: 'c' }] };
        registerFlow(this.owner, flow);
        const service = this.owner.lookup('service:onboarding-orchestrator');

        await service.start('resume');
        await service.next();

        assert.deepEqual(JSON.parse(window.localStorage.getItem('onboarding:history:resume')), ['a'], 'only ids are stored');

        await service.start('resume', { resume: true });

        assert.deepEqual(
            service.history.map((step) => step.id),
            ['a'],
            'the stored ids are rehydrated into step objects'
        );
        assert.strictEqual(service.history[0], flow.steps[0], 'and resolve to the real step objects');
    });

    test('resuming ignores stored ids that are no longer part of the flow', async function (assert) {
        registerFlow(this.owner, { id: 'drift', entry: 'a', steps: [{ id: 'a', next: 'b' }, { id: 'b' }] });
        window.localStorage.setItem('onboarding:history:drift', JSON.stringify(['a', 'removed-step']));
        const service = this.owner.lookup('service:onboarding-orchestrator');

        await service.start('drift', { resume: true });

        assert.deepEqual(
            service.history.map((step) => step.id),
            ['a'],
            'ids with no matching step are dropped'
        );
    });

    test('resuming with nothing stored leaves history empty', async function (assert) {
        registerFlow(this.owner, { id: 'fresh', entry: 'a', steps: [{ id: 'a' }] });
        const service = this.owner.lookup('service:onboarding-orchestrator');

        await service.start('fresh', { resume: true });

        assert.deepEqual(service.history, []);
    });

    test('resuming from unparseable stored history resets it instead of failing', async function (assert) {
        registerFlow(this.owner, { id: 'corrupt', entry: 'a', steps: [{ id: 'a' }] });
        window.localStorage.setItem('onboarding:history:corrupt', 'not-json');
        const service = this.owner.lookup('service:onboarding-orchestrator');

        await service.start('corrupt', { resume: true });

        assert.deepEqual(service.history, [], 'corrupt history is discarded');
        assert.strictEqual(service.current.id, 'a', 'and the flow still starts');
    });

    test('the history helpers are inert until a flow is loaded', function (assert) {
        const service = this.owner.lookup('service:onboarding-orchestrator');

        service._persistHistory();
        service._restoreHistory();
        service._clearHistory();

        assert.deepEqual(service.history, [], 'no flow means nothing to persist, restore or clear');
        assert.strictEqual(window.localStorage.getItem('onboarding:history:default'), null, 'and nothing is written under the fallback key');
    });

    test('a storage failure while persisting history does not break navigation', async function (assert) {
        registerFlow(this.owner, { id: 'nostore', entry: 'a', steps: [{ id: 'a', next: 'b' }, { id: 'b' }] });
        const service = this.owner.lookup('service:onboarding-orchestrator');
        await service.start('nostore');

        const restore = breakStorage('setItem');
        try {
            await service.next();
        } finally {
            restore();
        }

        assert.strictEqual(service.current.id, 'b', 'the step change still happened');
        assert.deepEqual(
            service.history.map((step) => step.id),
            ['a'],
            'in-memory history is still correct'
        );
    });

    test('a storage failure while clearing history does not break flow completion', async function (assert) {
        registerFlow(this.owner, { id: 'noclear', entry: 'a', steps: [{ id: 'a' }] });
        const service = this.owner.lookup('service:onboarding-orchestrator');
        await service.start('noclear');

        const restore = breakStorage('removeItem');
        try {
            await service.next();
        } finally {
            restore();
        }

        assert.strictEqual(service.current, null, 'the flow still completed');
    });
});

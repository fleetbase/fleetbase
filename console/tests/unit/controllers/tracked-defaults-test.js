import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';
import Service from '@ember/service';
import getTwoFaMethods from '@fleetbase/console/utils/get-two-fa-methods';

/**
 * A @tracked field's initializer only runs the first time the property is read, so a
 * controller whose defaults are never read has them recorded as uncovered. These assert
 * the starting state each screen presents before anything writes to it — which is real
 * behaviour: it is what the template binds to on first paint.
 */
const CONTROLLERS = [
    {
        name: 'controller:auth/login',
        defaults: { isValidating: false, isLoading: false, isSlowConnection: false, timeout: null },
    },
    {
        name: 'controller:auth/two-fa',
        defaults: { otpValue: '', countdownReady: false, isCodeExpired: false, verificationCode: '' },
    },
    // These three load their real state from the API in their constructors. The defaults
    // below are what the screen shows in the moment before that request comes back, so they
    // are read synchronously — a settled() here would overwrite them with the response.
    {
        name: 'controller:console/account/auth',
        defaults: { twoFaConfig: {}, isSystemTwoFaEnabled: false, methods: getTwoFaMethods() },
    },
    {
        name: 'controller:console/admin/two-fa-settings',
        defaults: { twoFaConfig: {}, isSystemTwoFaEnabled: false, isTwoFaEnforced: false, isLoading: false },
    },
    {
        name: 'controller:console/settings/notifications',
        defaults: { notificationSettings: {}, notificationTransportMethods: ['email', 'sms'] },
    },
    {
        name: 'controller:console/admin/branding',
        defaults: { isLoading: false },
    },
    {
        // The virtual admin screen is pure layout: these classes are the whole controller.
        name: 'controller:console/admin/virtual',
        defaults: {
            bodyClass: 'overflow-y-scroll h-full',
            containerClass: 'container mx-auto h-screen',
            wrapperClass: 'max-w-3xl my-10 mx-auto',
        },
    },
    {
        name: 'controller:console/admin/schedule-monitor/logs',
        defaults: { logs: [] },
    },
];

module('Unit | Controller | tracked defaults', function (hooks) {
    setupTest(hooks);

    hooks.beforeEach(function () {
        // Several of these controllers reach for fetch as soon as they are built.
        class FetchStub extends Service {
            get() {
                return Promise.resolve({});
            }
            post() {
                return Promise.resolve({});
            }
        }
        this.owner.register('service:fetch', FetchStub);
    });

    CONTROLLERS.forEach(({ name, defaults }) => {
        test(`${name} starts in its documented default state`, function (assert) {
            const controller = this.owner.lookup(name);

            for (const [property, value] of Object.entries(defaults)) {
                assert.deepEqual(controller[property], value, property);
            }
        });
    });

    test('auth/verification starts ready-to-submit off and exposes its query params', function (assert) {
        // Looked up without settling: this controller schedules a 75s timer in its
        // constructor which willDestroy cancels at teardown.
        const controller = this.owner.lookup('controller:auth/verification');

        assert.false(controller.isReadyToSubmit, 'the submit button is disabled until a code is typed');
        assert.false(controller.stillWaiting);
        assert.deepEqual(controller.queryParams, ['hello', 'token', 'code']);
    });

    test('onboard/verify-email exposes its query params', function (assert) {
        const controller = this.owner.lookup('controller:onboard/verify-email');

        assert.deepEqual(controller.queryParams, ['hello', 'code']);
    });
});

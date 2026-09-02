import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';
import Service from '@ember/service';

/**
 * Every action on this controller opens a modal and does its work in the confirm callback,
 * so each test opens the modal, inspects what it was configured with, then drives confirm.
 */
module('Unit | Controller | console/admin/organizations/details/settings', function (hooks) {
    setupTest(hooks);

    hooks.beforeEach(function () {
        this.patched = [];
        this.patchRejectsWith = null;
        this.saveRejectsWith = null;
        const context = this;

        class FetchStub extends Service {
            patch(path, payload) {
                context.patched.push({ path, payload });
                return context.patchRejectsWith ? Promise.reject(context.patchRejectsWith) : Promise.resolve({ ok: true });
            }
        }
        class NotificationsStub extends Service {
            successes = [];
            serverErrors = [];
            success(message) {
                this.successes.push(message);
            }
            serverError(error) {
                this.serverErrors.push(error);
            }
        }
        class ModalsManagerStub extends Service {
            shown = [];
            confirmed = [];
            show(name, options) {
                this.shown.push({ name, options });
            }
            confirm(options) {
                this.confirmed.push(options);
            }
        }

        this.owner.register('service:fetch', FetchStub);
        this.owner.register('service:notifications', NotificationsStub);
        this.owner.register('service:modals-manager', ModalsManagerStub);

        this.saved = 0;
        this.build = () => {
            const controller = this.owner.lookup('controller:console/admin/organizations/details/settings');
            controller.model = {
                uuid: 'co_1',
                name: 'Fleetbase',
                save: () => {
                    this.saved++;
                    return this.saveRejectsWith ? Promise.reject(this.saveRejectsWith) : Promise.resolve();
                },
            };

            this.refreshes = 0;
            Object.defineProperty(controller.router, 'refresh', {
                configurable: true,
                value: () => {
                    this.refreshes++;
                    return 'refreshed';
                },
            });

            return controller;
        };
        this.modals = () => this.owner.lookup('service:modals-manager');
        this.notifications = () => this.owner.lookup('service:notifications');
        this.modal = () => {
            const calls = [];
            return { calls, startLoading: () => calls.push('startLoading') };
        };
    });

    test('editOrganization opens the edit modal against the loaded organization', function (assert) {
        const controller = this.build();

        controller.editOrganization();

        const { name, options } = this.modals().shown[0];
        assert.strictEqual(name, 'modals/edit-organization');
        assert.strictEqual(options.title, 'Edit Organization');
        assert.strictEqual(options.acceptButtonText, 'Save Changes');
        assert.strictEqual(options.organization, controller.model, 'the modal edits the loaded record');
    });

    test('confirming the edit saves the organization and reloads', async function (assert) {
        const controller = this.build();
        controller.editOrganization();
        const modal = this.modal();

        await this.modals().shown[0].options.confirm(modal);

        assert.strictEqual(this.saved, 1);
        assert.deepEqual(modal.calls, ['startLoading']);
        assert.deepEqual(this.notifications().successes, ['Organization updated.']);
        assert.strictEqual(this.refreshes, 1);
    });

    test('a failed edit is reported and nothing reloads', async function (assert) {
        const failure = new Error('save rejected');
        this.saveRejectsWith = failure;
        const controller = this.build();
        controller.editOrganization();

        await this.modals().shown[0].options.confirm(this.modal());

        assert.deepEqual(this.notifications().serverErrors, [failure]);
        assert.strictEqual(this.refreshes, 0);
    });

    test('setStatus asks for confirmation naming the new status', function (assert) {
        this.build().setStatus('suspended');

        const options = this.modals().confirmed[0];
        assert.strictEqual(options.title, 'Update Organization Status');
        assert.strictEqual(options.body, 'Set this organization status to suspended?');
        assert.strictEqual(options.acceptButtonText, 'Update Status');
    });

    test('confirming a status change patches the organization and reloads', async function (assert) {
        this.build().setStatus('active');

        await this.modals().confirmed[0].confirm(this.modal());

        assert.deepEqual(this.patched, [{ path: 'companies/co_1/status', payload: { status: 'active' } }]);
        assert.deepEqual(this.notifications().successes, ['Organization status updated.']);
        assert.strictEqual(this.refreshes, 1);
    });

    test('a failed status change is reported and nothing reloads', async function (assert) {
        const failure = new Error('status patch rejected');
        this.patchRejectsWith = failure;
        this.build().setStatus('active');

        await this.modals().confirmed[0].confirm(this.modal());

        assert.deepEqual(this.notifications().serverErrors, [failure]);
        assert.strictEqual(this.refreshes, 0);
    });

    test('setOnboarding words its prompt for completing onboarding', function (assert) {
        this.build().setOnboarding(true);

        const options = this.modals().confirmed[0];
        assert.strictEqual(options.title, 'Mark Onboarding Complete');
        assert.strictEqual(options.body, 'Mark this organization onboarding as complete?');
        assert.strictEqual(options.acceptButtonText, 'Mark Complete');
    });

    test('setOnboarding words its prompt for reopening onboarding', function (assert) {
        this.build().setOnboarding(false);

        const options = this.modals().confirmed[0];
        assert.strictEqual(options.title, 'Mark Onboarding Incomplete');
        assert.strictEqual(options.body, 'Mark this organization onboarding as incomplete?');
        assert.strictEqual(options.acceptButtonText, 'Mark Incomplete');
    });

    test('confirming an onboarding change patches the organization and reloads', async function (assert) {
        this.build().setOnboarding(true);

        await this.modals().confirmed[0].confirm(this.modal());

        assert.deepEqual(this.patched, [{ path: 'companies/co_1/onboarding', payload: { completed: true } }]);
        assert.deepEqual(this.notifications().successes, ['Organization onboarding updated.']);
        assert.strictEqual(this.refreshes, 1);
    });

    test('a failed onboarding change is reported and nothing reloads', async function (assert) {
        const failure = new Error('onboarding patch rejected');
        this.patchRejectsWith = failure;
        this.build().setOnboarding(false);

        await this.modals().confirmed[0].confirm(this.modal());

        assert.deepEqual(this.notifications().serverErrors, [failure]);
        assert.strictEqual(this.refreshes, 0);
    });
});

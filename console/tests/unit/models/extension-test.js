import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';
import Service from '@ember/service';

module('Unit | Model | extension', function (hooks) {
    setupTest(hooks);

    test('toJSON emits a plain object of the model attributes', function (assert) {
        const store = this.owner.lookup('service:store');
        const json = store.createRecord('extension', { name: 'fleet-ops', display_name: 'Fleet Ops' }).toJSON();

        assert.strictEqual(json.name, 'fleet-ops');
        assert.strictEqual(json.display_name, 'Fleet Ops');
    });
});

module('Unit | Model | extension | install', function (hooks) {
    setupTest(hooks);

    hooks.beforeEach(function () {
        this.posted = [];
        this.postRejectsWith = null;
        const context = this;

        class FetchStub extends Service {
            post(path, payload) {
                context.posted.push({ path, payload });
                return context.postRejectsWith ? Promise.reject(context.postRejectsWith) : Promise.resolve({ status: 'ok' });
            }
        }
        this.owner.register('service:fetch', FetchStub);

        this.store = this.owner.lookup('service:store');
        this.extension = () => this.store.push({ data: { id: 'ext_1', type: 'extension' } });
    });

    test('install posts the extension id and flags it as installed', async function (assert) {
        const extension = this.extension();

        const response = await extension.install();

        assert.deepEqual(this.posted, [{ path: 'installer/install', payload: { extension: 'ext_1' } }]);
        assert.deepEqual(response, { status: 'ok' }, 'the server response is handed back');
        assert.true(extension.is_installed);
    });

    test('a failed install surfaces and leaves the flag alone', async function (assert) {
        this.postRejectsWith = new Error('installer unavailable');
        const extension = this.extension();

        await assert.rejects(extension.install(), /installer unavailable/);

        assert.notOk(extension.is_installed, 'the extension is not marked installed');
    });

    test('uninstall posts the extension id and clears the flag', async function (assert) {
        const extension = this.extension();
        extension.is_installed = true;

        await extension.uninstall();

        assert.deepEqual(this.posted, [{ path: 'installer/uninstall', payload: { extension: 'ext_1' } }]);
        assert.false(extension.is_installed);
    });

    test('a failed uninstall surfaces and leaves the extension installed', async function (assert) {
        this.postRejectsWith = new Error('uninstall failed');
        const extension = this.extension();
        extension.is_installed = true;

        await assert.rejects(extension.uninstall(), /uninstall failed/);

        assert.true(extension.is_installed);
    });

    test('hasIcon reflects whether an icon is attached', function (assert) {
        const extension = this.store.createRecord('extension');
        assert.false(extension.hasIcon);

        extension.icon_uuid = 'icon_1';
        assert.true(extension.hasIcon);
    });

    test('the timestamp getters format both dates in each style', function (assert) {
        const extension = this.store.createRecord('extension', {
            created_at: new Date('2026-01-15T10:30:00Z'),
            updated_at: new Date('2026-02-20T08:05:00Z'),
        });

        assert.ok(/^2026-01-15 /.test(extension.createdAt), `createdAt is date and time (got ${extension.createdAt})`);
        assert.ok(/^2026-02-20 /.test(extension.updatedAt), `updatedAt is date and time (got ${extension.updatedAt})`);
        assert.strictEqual(extension.createdAtShort, 'Jan 15, 2026');
        assert.strictEqual(extension.updatedAtShort, 'Feb 20, 2026');
        assert.ok(extension.createdAgo.length > 0);
        assert.ok(extension.updatedAgo.length > 0);
    });
});

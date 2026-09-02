import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';
import Service from '@ember/service';

module('Unit | Model | company', function (hooks) {
    setupTest(hooks);

    hooks.beforeEach(function () {
        this.posted = [];
        this.getResponse = () => Promise.resolve(['user-a']);
        const self = this;

        class FetchStub extends Service {
            post(path, payload) {
                self.posted.push({ path, payload });
                return Promise.resolve({ ok: true });
            }
            get(path, params, options) {
                self.posted.push({ path, params, options });
                return self.getResponse();
            }
        }
        this.owner.register('service:fetch', FetchStub);

        this.store = this.owner.lookup('service:store');
        this.company = (attrs = {}) => this.store.createRecord('company', attrs);
    });

    test('statusLabel defaults to active and onboardingStatus reflects the flag', function (assert) {
        assert.strictEqual(this.company({}).statusLabel, 'active');
        assert.strictEqual(this.company({ status: 'suspended' }).statusLabel, 'suspended');

        assert.strictEqual(this.company({}).onboardingStatus, 'incomplete', 'defaults to incomplete');
        assert.strictEqual(this.company({ onboarding_completed: true }).onboardingStatus, 'complete');
    });

    test('phoneCountryCode falls back to the country', function (assert) {
        assert.strictEqual(this.company({ country: 'SG' }).phoneCountryCode, 'SG');
    });

    test('the timestamp getters format created_at and updated_at', function (assert) {
        const at = new Date('2026-05-06T14:30:00Z');
        const company = this.company({ created_at: at, updated_at: at });

        assert.ok(company.createdAt.startsWith('2026-05-06'), company.createdAt);
        assert.ok(company.updatedAt.startsWith('2026-05-06'));
        assert.strictEqual(typeof company.createdAtShort, 'string');
        assert.strictEqual(typeof company.updatedAtShort, 'string');
        assert.strictEqual(typeof company.createdAgo, 'string');
        assert.strictEqual(typeof company.updatedAgo, 'string');
    });

    test('toJSON serializes the record attributes', function (assert) {
        const json = this.company({ name: 'Acme' }).toJSON();

        assert.strictEqual(json.name, 'Acme');
    });

    test('transferOwnership posts the company and the new owner', async function (assert) {
        const company = this.store.push({ data: { id: 'co_1', type: 'company' } });

        await company.transferOwnership('user_2', { leave: true });

        assert.deepEqual(this.posted.at(-1), {
            path: 'companies/transfer-ownership',
            payload: { company: 'co_1', newOwner: 'user_2', leave: true },
        });
    });

    test('leave posts the company and optional user', async function (assert) {
        const company = this.store.push({ data: { id: 'co_1', type: 'company' } });

        await company.leave();
        assert.deepEqual(this.posted.at(-1).payload, { company: 'co_1', user: null });

        await company.leave('user_3', { force: true });
        assert.deepEqual(this.posted.at(-1).payload, { company: 'co_1', user: 'user_3', force: true });
    });

    test('loadUsers stores the fetched users on the record', async function (assert) {
        const company = this.store.push({ data: { id: 'co_1', type: 'company' } });

        const users = await company.loadUsers({ exclude: ['user_1'] });

        assert.deepEqual(users, ['user-a']);
        assert.deepEqual(company.get('users'), ['user-a'], 'the result is cached on the record');
        assert.strictEqual(this.posted.at(-1).path, 'companies/co_1/users');
        assert.deepEqual(this.posted.at(-1).params, { exclude: ['user_1'] });
    });

    test('loadUsers falls back to an empty list when the request fails', async function (assert) {
        this.getResponse = () => Promise.reject(new Error('nope'));
        const company = this.store.push({ data: { id: 'co_1', type: 'company' } });

        const users = await company.loadUsers();

        assert.deepEqual(users, [], 'the failure is swallowed');
        assert.deepEqual(company.get('users'), []);
    });
});

module('Unit | Model | company | ownership transfer defaults', function (hooks) {
    setupTest(hooks);

    hooks.beforeEach(function () {
        const context = this;

        class FetchStub extends Service {
            post(path, payload) {
                context.posted = { path, payload };
                return Promise.resolve({ status: 'ok' });
            }
        }
        this.owner.register('service:fetch', FetchStub);
        this.company = this.owner.lookup('service:store').push({ data: { id: 'co_1', type: 'company', attributes: { name: 'Acme' } } });
    });

    test('transferring ownership without extra parameters posts just the company and new owner', async function (assert) {
        await this.company.transferOwnership('user_2');

        assert.deepEqual(this.posted, { path: 'companies/transfer-ownership', payload: { company: 'co_1', newOwner: 'user_2' } });
    });

    test('extra parameters are merged into the transfer payload', async function (assert) {
        await this.company.transferOwnership('user_2', { leave: true });

        assert.deepEqual(this.posted.payload, { company: 'co_1', newOwner: 'user_2', leave: true });
    });
});

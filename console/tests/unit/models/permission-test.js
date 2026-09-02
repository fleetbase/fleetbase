import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';
import { parserPermissionName, getPermissionExtension, getPermissionAction, getPermissionResource } from '@fleetbase/console/models/permission';

module('Unit | Model | permission', function (hooks) {
    setupTest(hooks);

    hooks.beforeEach(function () {
        this.store = this.owner.lookup('service:store');
        this.permission = (attrs = {}) => this.store.createRecord('permission', attrs);
    });

    test('parserPermissionName picks the requested segment and returns null past the end', function (assert) {
        assert.strictEqual(parserPermissionName('fleet-ops view driver'), 'fleet-ops', 'defaults to the first segment');
        assert.strictEqual(parserPermissionName('fleet-ops view driver', 1), 'view');
        assert.strictEqual(parserPermissionName('fleet-ops view driver', 2), 'driver');
        assert.strictEqual(parserPermissionName('fleet-ops', 1), null, 'missing segments yield null');
    });

    test('the extension/action/resource helpers read their segments', function (assert) {
        assert.strictEqual(getPermissionExtension('iam view user'), 'iam');
        assert.strictEqual(getPermissionAction('iam view user'), 'view');
        assert.strictEqual(getPermissionResource('iam view user'), 'user');
    });

    test('toJSON emits the persisted attributes', function (assert) {
        const json = this.permission({ name: 'fleet-ops view driver', guard_name: 'sanctum', service: 'fleet-ops' }).toJSON();

        assert.strictEqual(json.name, 'fleet-ops view driver');
        assert.strictEqual(json.guard_name, 'sanctum');
        assert.strictEqual(json.service, 'fleet-ops');
        assert.deepEqual(Object.keys(json).sort(), ['created_at', 'guard_name', 'name', 'service', 'updated_at']);
    });

    test('serviceName and extensionName both read the leading segment', function (assert) {
        const permission = this.permission({ name: 'fleet-ops view driver' });

        assert.strictEqual(permission.serviceName, 'fleet-ops');
        assert.strictEqual(permission.extensionName, 'fleet-ops');
    });

    test('resourceName reads the third segment', function (assert) {
        assert.strictEqual(this.permission({ name: 'fleet-ops view driver' }).resourceName, 'driver');
        assert.strictEqual(this.permission({ name: 'fleet-ops view' }).resourceName, null);
    });

    test('actionName titleizes the action and special-cases wildcard and see', function (assert) {
        assert.strictEqual(this.permission({ name: 'fleet-ops * driver' }).actionName, 'do anything');
        assert.strictEqual(this.permission({ name: 'fleet-ops see driver' }).actionName, 'Visibly See');
        assert.strictEqual(this.permission({ name: 'fleet-ops view driver' }).actionName, 'View');
        assert.strictEqual(this.permission({ name: 'fleet-ops create_order driver' }).actionName, 'Create Order', 'underscores are humanized');
    });

    test('description reads as a sentence and pluralizes the resource', function (assert) {
        const description = this.permission({ name: 'fleet-ops view driver' }).description;

        assert.ok(description.startsWith('Permission to View'), description);
        assert.ok(description.includes('Drivers'), 'the resource is pluralized');
        assert.ok(/on Fleet.?Ops$/i.test(description), `it ends with the extension: ${description}`);
    });

    test('description uses "with" for wildcard actions and upper-cases IAM', function (assert) {
        const wildcard = this.permission({ name: 'iam * user' });

        assert.ok(wildcard.description.includes('with'), `wildcard uses the "with" preposition: ${wildcard.description}`);
        assert.ok(wildcard.description.includes('IAM'), 'the iam extension is upper-cased');
        assert.ok(wildcard.description.includes('do anything'));
    });

    test('the timestamp getters format created_at and updated_at', function (assert) {
        const at = new Date('2026-05-06T14:30:00Z');
        const permission = this.permission({ created_at: at, updated_at: at });

        assert.ok(permission.createdAt.startsWith('2026-05-06'), permission.createdAt);
        assert.strictEqual(typeof permission.updatedAt, 'string');
        assert.strictEqual(typeof permission.createdAgo, 'string');
        assert.strictEqual(typeof permission.updatedAgo, 'string');
    });
});

module('Unit | Model | permission | incomplete names', function (hooks) {
    setupTest(hooks);

    hooks.beforeEach(function () {
        this.permission = (attrs = {}) => this.owner.lookup('service:store').createRecord('permission', attrs);
    });

    test('actionName is empty when the name carries no action segment', function (assert) {
        // getPermissionAction returns null here, and titleize has to survive that rather
        // than blowing up while a permission list renders.
        assert.strictEqual(this.permission({ name: 'fleet-ops' }).actionName, '');
    });

    test('description drops the resource when the name has only two segments', function (assert) {
        const description = this.permission({ name: 'fleet-ops view' }).description;

        assert.ok(description.startsWith('Permission to View'), description);
        assert.ok(/on Fleet.?Ops$/i.test(description), 'the extension still closes the sentence');
        assert.ok(description.includes('View   on'), 'the resource and its preposition are both blank');
    });

    test('a wildcard action with no resource does not take the "with" preposition', function (assert) {
        const description = this.permission({ name: 'iam *' }).description;

        assert.notOk(description.includes('with'), `there is nothing to be "with": ${description}`);
        assert.ok(description.includes('do anything'));
        assert.ok(description.includes('IAM'));
    });
});

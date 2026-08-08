import onboard from '@fleetbase/console/validations/onboard';
import { module, test } from 'qunit';

module('Unit | Validation | onboard', function () {
    test('defines rules for every onboarding field', function (assert) {
        assert.deepEqual(Object.keys(onboard).sort(), ['email', 'name', 'organization_name', 'password', 'password_confirmation']);
    });

    test('name and organization_name are required', function (assert) {
        const [namePresence] = onboard.name;
        const [orgPresence] = onboard.organization_name;
        assert.notStrictEqual(namePresence('name', ''), true, 'empty name fails');
        assert.strictEqual(namePresence('name', 'Ron'), true, 'present name passes');
        assert.notStrictEqual(orgPresence('organization_name', ''), true, 'empty org fails');
        assert.strictEqual(orgPresence('organization_name', 'Fleetbase'), true, 'present org passes');
    });

    test('email must be present and a valid email address', function (assert) {
        const [presence, format] = onboard.email;
        assert.notStrictEqual(presence('email', ''), true, 'empty email fails presence');
        assert.strictEqual(presence('email', 'a@b.co'), true, 'present email passes presence');
        assert.strictEqual(format('email', 'a@b.co'), true, 'valid email passes format');
        assert.notStrictEqual(format('email', 'not-an-email'), true, 'invalid email fails format');
    });

    test('password must be present and at least 8 characters', function (assert) {
        const [presence, length] = onboard.password;
        assert.notStrictEqual(presence('password', ''), true, 'empty password fails presence');
        assert.notStrictEqual(length('password', 'short'), true, 'short password fails length');
        assert.strictEqual(length('password', 'longenough'), true, 'long password passes length');
    });

    test('password_confirmation must match password', function (assert) {
        const [, confirmation] = onboard.password_confirmation;
        assert.strictEqual(confirmation('password_confirmation', 'secret123', null, { password: 'secret123' }, {}), true, 'matching confirmation passes');
        assert.notStrictEqual(confirmation('password_confirmation', 'different', null, { password: 'secret123' }, {}), true, 'mismatched confirmation fails');
    });
});

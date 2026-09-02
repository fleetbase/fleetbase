import { module, test } from 'qunit';
import { format } from 'date-fns';
import { setupTest } from '@fleetbase/console/tests/helpers';
import { subMinutes } from 'date-fns';

module('Unit | Model | alert', function (hooks) {
    setupTest(hooks);

    hooks.beforeEach(function () {
        this.store = this.owner.lookup('service:store');
        this.alert = (attrs = {}) => this.store.createRecord('alert', attrs);
    });

    test('lifecycle flags derive from the acknowledged/resolved timestamps', function (assert) {
        const pending = this.alert({});
        assert.false(pending.isAcknowledged);
        assert.false(pending.isResolved);
        assert.true(pending.isPending, 'neither acknowledged nor resolved');
        assert.false(pending.isActive);

        const active = this.alert({ acknowledged_at: new Date() });
        assert.true(active.isAcknowledged);
        assert.false(active.isPending);
        assert.true(active.isActive, 'acknowledged but unresolved');

        const resolved = this.alert({ acknowledged_at: new Date(), resolved_at: new Date() });
        assert.true(resolved.isResolved);
        assert.false(resolved.isActive);
        assert.false(resolved.isPending);
    });

    test('status text, badge and icon follow resolved > acknowledged > pending', function (assert) {
        const pending = this.alert({});
        assert.strictEqual(pending.statusText, 'Pending');
        assert.strictEqual(pending.statusIcon, 'fas fa-bell');
        assert.ok(pending.statusBadgeClass.includes('red'), 'pending is red');

        const acknowledged = this.alert({ acknowledged_at: new Date() });
        assert.strictEqual(acknowledged.statusText, 'Acknowledged');
        assert.strictEqual(acknowledged.statusIcon, 'fas fa-eye');
        assert.ok(acknowledged.statusBadgeClass.includes('blue'), 'acknowledged is blue');

        const resolved = this.alert({ resolved_at: new Date() });
        assert.strictEqual(resolved.statusText, 'Resolved');
        assert.strictEqual(resolved.statusIcon, 'fas fa-check-circle');
        assert.ok(resolved.statusBadgeClass.includes('green'), 'resolved is green');
    });

    test('the timestamp getters format known dates and fall back when unset', function (assert) {
        const at = new Date('2026-05-06T14:30:00Z');
        const filled = this.alert({ triggered_at: at, acknowledged_at: at, resolved_at: at, created_at: at, updated_at: at });

        assert.ok(filled.triggeredAt.startsWith('2026-05-06'), filled.triggeredAt);
        assert.ok(filled.acknowledgedAt.startsWith('2026-05-06'));
        assert.ok(filled.resolvedAt.startsWith('2026-05-06'));
        assert.ok(filled.createdAt.startsWith('2026-05-06'));
        assert.ok(filled.updatedAt.startsWith('2026-05-06'));
        assert.ok(filled.triggeredAgo.endsWith(' ago'));
        assert.ok(filled.acknowledgedAgo.endsWith(' ago'));
        assert.ok(filled.resolvedAgo.endsWith(' ago'));

        const empty = this.alert({});
        assert.strictEqual(empty.triggeredAgo, 'Unknown');
        assert.strictEqual(empty.triggeredAt, 'Unknown');
        assert.strictEqual(empty.acknowledgedAgo, null, 'no acknowledgement yields null, not a label');
        assert.strictEqual(empty.acknowledgedAt, 'Not acknowledged');
        assert.strictEqual(empty.resolvedAgo, null);
        assert.strictEqual(empty.resolvedAt, 'Not resolved');
    });

    test('duration getters measure from triggered_at and are null when incomplete', function (assert) {
        const triggered = subMinutes(new Date(), 90);
        const alert = this.alert({ triggered_at: triggered, acknowledged_at: subMinutes(new Date(), 60), resolved_at: new Date() });

        assert.strictEqual(alert.acknowledgmentDurationMinutes, 30);
        assert.strictEqual(alert.resolutionDurationMinutes, 90);

        const untriggered = this.alert({ acknowledged_at: new Date() });
        assert.strictEqual(untriggered.acknowledgmentDurationMinutes, null, 'needs both ends');
        assert.strictEqual(untriggered.resolutionDurationMinutes, null);
    });

    test('durations format as minutes, hours or days', function (assert) {
        const now = new Date();
        const mins = this.alert({ triggered_at: subMinutes(now, 45), acknowledged_at: now });
        assert.strictEqual(mins.acknowledgmentDurationFormatted, '45m');

        const hours = this.alert({ triggered_at: subMinutes(now, 150), acknowledged_at: now });
        assert.strictEqual(hours.acknowledgmentDurationFormatted, '2h 30m');

        const days = this.alert({ triggered_at: subMinutes(now, 1500), resolved_at: now });
        assert.strictEqual(days.resolutionDurationFormatted, '1d 1h');

        assert.strictEqual(this.alert({}).acknowledgmentDurationFormatted, null);
        assert.strictEqual(this.alert({}).resolutionDurationFormatted, null);
    });

    test('ageMinutes and ageFormatted measure elapsed time since trigger', function (assert) {
        assert.strictEqual(this.alert({}).ageMinutes, 0, 'untriggered alerts have no age');
        assert.strictEqual(this.alert({}).ageFormatted, '0m');

        const aged = this.alert({ triggered_at: subMinutes(new Date(), 200) });
        assert.strictEqual(aged.ageMinutes, 200);
        assert.strictEqual(aged.ageFormatted, '3h 20m');
    });

    test('severity presentation maps known severities and falls back to info', function (assert) {
        assert.ok(this.alert({ severity: 'critical' }).severityBadgeClass.includes('red'));
        assert.strictEqual(this.alert({ severity: 'critical' }).severityIcon, 'fas fa-exclamation-circle');
        assert.ok(this.alert({ severity: 'critical' }).severityColor.includes('red'));

        assert.strictEqual(this.alert({ severity: 'high' }).severityIcon, 'fas fa-exclamation-triangle');
        assert.strictEqual(this.alert({ severity: 'medium' }).severityIcon, 'fas fa-exclamation');
        assert.strictEqual(this.alert({ severity: 'low' }).severityIcon, 'fas fa-info-circle');

        const unknown = this.alert({ severity: 'not-a-severity' });
        assert.strictEqual(unknown.severityIcon, 'fas fa-info', 'unknown severity falls back to info');
        assert.ok(unknown.severityBadgeClass.includes('gray'));
        assert.ok(unknown.severityColor.includes('gray'));
    });

    test('type presentation maps known types and falls back to a bell', function (assert) {
        assert.strictEqual(this.alert({ type: 'maintenance' }).typeIcon, 'fas fa-wrench');
        assert.strictEqual(this.alert({ type: 'fuel' }).typeIcon, 'fas fa-gas-pump');
        assert.strictEqual(this.alert({ type: 'security' }).typeIcon, 'fas fa-shield-alt');
        assert.ok(this.alert({ type: 'temperature' }).typeBadgeClass.includes('red'));

        const unknown = this.alert({ type: 'not-a-type' });
        assert.strictEqual(unknown.typeIcon, 'fas fa-bell');
        assert.ok(unknown.typeBadgeClass.includes('gray'));
    });

    test('subjectTypeFormatted maps known subjects and humanizes the rest', function (assert) {
        assert.strictEqual(this.alert({ subject_type: 'vehicle' }).subjectTypeFormatted, 'Vehicle');
        assert.strictEqual(this.alert({ subject_type: 'fuel_report' }).subjectTypeFormatted, 'Fuel Report');
        assert.strictEqual(this.alert({ subject_type: 'custom_thing' }).subjectTypeFormatted, 'Custom Thing', 'unknown types are humanized');
        assert.strictEqual(this.alert({}).subjectTypeFormatted, 'Unknown');
    });

    test('urgencyLevel escalates with severity and age', function (assert) {
        const now = new Date();

        assert.strictEqual(this.alert({ severity: 'critical', triggered_at: now }).urgencyLevel, 'high', 'fresh critical is high');
        assert.strictEqual(this.alert({ severity: 'critical', triggered_at: subMinutes(now, 120) }).urgencyLevel, 'urgent', 'critical over an hour is urgent');
        assert.strictEqual(this.alert({ severity: 'medium', triggered_at: now }).urgencyLevel, 'medium');
        assert.strictEqual(this.alert({ severity: 'medium', triggered_at: subMinutes(now, 300) }).urgencyLevel, 'urgent', 'medium over four hours is urgent');
        assert.strictEqual(this.alert({ severity: 'info', triggered_at: now }).urgencyLevel, 'low');
        assert.strictEqual(this.alert({ severity: 'nonsense', triggered_at: now }).urgencyLevel, 'low', 'unknown severity carries no weight');

        assert.ok(this.alert({ severity: 'critical', triggered_at: subMinutes(now, 120) }).urgencyBadgeClass.includes('animate-pulse'), 'urgent pulses');
        assert.ok(this.alert({ severity: 'info', triggered_at: now }).urgencyBadgeClass.includes('green'));
    });

    test('hasContext, hasRule and hasLocation report populated payloads', function (assert) {
        assert.false(this.alert({}).hasContext);
        assert.false(this.alert({ context: {} }).hasContext, 'an empty object does not count');
        assert.true(this.alert({ context: { value: 1 } }).hasContext);

        assert.false(this.alert({ rule: {} }).hasRule);
        assert.true(this.alert({ rule: { threshold: 5 } }).hasRule);

        assert.false(this.alert({ context: {} }).hasLocation);
        assert.true(this.alert({ context: { location: 'here' } }).hasLocation);
    });

    test('thresholdExceeded evaluates every supported operator', function (assert) {
        const check = (operator, value, threshold) => this.alert({ context: { value }, rule: { operator, threshold } }).thresholdExceeded;

        assert.true(check('>', 10, 5));
        assert.false(check('>', 3, 5));
        assert.true(check('<', 3, 5));
        assert.true(check('>=', 5, 5));
        assert.true(check('<=', 5, 5));
        assert.true(check('==', 5, 5));
        assert.true(check('!=', 6, 5));
        assert.strictEqual(check('~', 6, 5), null, 'an unsupported operator yields null');
    });

    test('thresholdExceeded defaults to greater-than and is null without both operands', function (assert) {
        assert.true(this.alert({ context: { value: 10 }, rule: { threshold: 5 } }).thresholdExceeded, 'defaults to >');
        assert.strictEqual(this.alert({ context: { value: 10 }, rule: {} }).thresholdExceeded, null);
        assert.strictEqual(this.alert({ context: {}, rule: { threshold: 5 } }).thresholdExceeded, null);
    });
});

module('Unit | Model | alert | duration formatting', function (hooks) {
    setupTest(hooks);

    hooks.beforeEach(function () {
        this.store = this.owner.lookup('service:store');
        // These three getters read derived minute counts the model does not declare as
        // attributes, so each case needs its own record — assigning would not invalidate
        // the @computed that already cached a value.
        this.withMinutes = (property, minutes) => {
            const alert = this.store.createRecord('alert');
            Object.defineProperty(alert, property, { configurable: true, value: minutes });
            return alert;
        };
    });

    test('acknowledgment duration is shown in minutes, hours or days', function (assert) {
        assert.strictEqual(this.withMinutes('acknowledgmentDurationMinutes', 0).acknowledgmentDurationFormatted, null, 'nothing to report');
        assert.strictEqual(this.withMinutes('acknowledgmentDurationMinutes', 45).acknowledgmentDurationFormatted, '45m');
        assert.strictEqual(this.withMinutes('acknowledgmentDurationMinutes', 150).acknowledgmentDurationFormatted, '2h 30m');
        assert.strictEqual(this.withMinutes('acknowledgmentDurationMinutes', 1560).acknowledgmentDurationFormatted, '1d 2h');
    });

    test('resolution duration is shown in minutes, hours or days', function (assert) {
        assert.strictEqual(this.withMinutes('resolutionDurationMinutes', 0).resolutionDurationFormatted, null);
        assert.strictEqual(this.withMinutes('resolutionDurationMinutes', 5).resolutionDurationFormatted, '5m');
        assert.strictEqual(this.withMinutes('resolutionDurationMinutes', 90).resolutionDurationFormatted, '1h 30m');
        assert.strictEqual(this.withMinutes('resolutionDurationMinutes', 2880).resolutionDurationFormatted, '2d 0h');
    });

    test('age is shown in minutes, hours or days', function (assert) {
        assert.strictEqual(this.withMinutes('ageMinutes', 30).ageFormatted, '30m');
        assert.strictEqual(this.withMinutes('ageMinutes', 61).ageFormatted, '1h 1m');
        assert.strictEqual(this.withMinutes('ageMinutes', 4321).ageFormatted, '3d 0h');
    });

    test('an unrecognised urgency falls back to the low styling', function (assert) {
        const low = this.store.createRecord('alert');
        Object.defineProperty(low, 'urgencyLevel', { configurable: true, value: 'low' });

        const unknown = this.store.createRecord('alert');
        Object.defineProperty(unknown, 'urgencyLevel', { configurable: true, value: 'not-a-level' });

        assert.strictEqual(unknown.urgencyBadgeClass, low.urgencyBadgeClass, 'unknown urgencies are styled as low');
    });

    test('the created and updated getters read as relative durations', function (assert) {
        const alert = this.store.createRecord('alert', {
            created_at: new Date('2026-01-15T10:30:00Z'),
            updated_at: new Date('2026-02-20T08:05:00Z'),
        });

        assert.ok(alert.createdAgo.endsWith(' ago'), `createdAgo reads as a duration (got ${alert.createdAgo})`);
        assert.ok(alert.updatedAgo.endsWith(' ago'), `updatedAgo reads as a duration (got ${alert.updatedAgo})`);
        assert.strictEqual(alert.updatedAt, format(new Date('2026-02-20T08:05:00Z'), 'yyyy-MM-dd HH:mm'));
    });
});

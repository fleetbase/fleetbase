import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';
import { format, formatDistanceToNow } from 'date-fns';

/**
 * Almost every model exposes the same family of timestamp getters over created_at and
 * updated_at. The format strings differ per model, so they are spelled out here rather than
 * derived — that way this table asserts the actual contract of each model instead of just
 * mirroring whatever the code happens to do.
 */
const DATETIME = 'yyyy-MM-dd HH:mm';
const SHORT = 'PP';

const MODELS = [
    { model: 'category', created: DATETIME, updated: DATETIME, short: SHORT },
    { model: 'comment', created: DATETIME, updated: DATETIME },
    { model: 'custom-field', created: DATETIME, updated: DATETIME },
    { model: 'custom-field-value', created: DATETIME, updated: DATETIME },
    { model: 'dashboard-widget', created: DATETIME, updated: DATETIME, short: SHORT },
    { model: 'group', created: DATETIME, updated: DATETIME },
    { model: 'policy', created: DATETIME, updated: DATETIME },
    { model: 'role', created: DATETIME, updated: DATETIME, short: SHORT },
    { model: 'template', created: DATETIME, updated: DATETIME, short: SHORT },
    { model: 'template-query', created: DATETIME, updated: DATETIME, short: SHORT },
    // The file model formats its updated stamp as a long date instead.
    { model: 'file', created: DATETIME, updated: 'PPP' },
];

const CREATED_AT = new Date('2026-01-15T10:30:00Z');
const UPDATED_AT = new Date('2026-02-20T08:05:00Z');

module('Unit | Model | timestamp getters', function (hooks) {
    setupTest(hooks);

    MODELS.forEach(({ model, created, updated, short }) => {
        test(`${model} formats created_at and updated_at`, function (assert) {
            const record = this.owner.lookup('service:store').createRecord(model, {
                created_at: CREATED_AT,
                updated_at: UPDATED_AT,
            });

            assert.strictEqual(record.createdAt, format(CREATED_AT, created), 'createdAt');
            assert.strictEqual(record.updatedAt, format(UPDATED_AT, updated), 'updatedAt');
            assert.strictEqual(record.createdAgo, formatDistanceToNow(CREATED_AT), 'createdAgo is relative');
            assert.strictEqual(record.updatedAgo, formatDistanceToNow(UPDATED_AT), 'updatedAgo is relative');

            if (short) {
                assert.strictEqual(record.createdAtShort, format(CREATED_AT, short), 'createdAtShort');
                assert.strictEqual(record.updatedAtShort, format(UPDATED_AT, short), 'updatedAtShort');
            }
        });
    });
});

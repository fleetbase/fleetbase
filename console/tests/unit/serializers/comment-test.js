import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';

module('Unit | Serializer | comment', function (hooks) {
    setupTest(hooks);

    test('serialize suppresses editable and subject_id but keeps content', function (assert) {
        const store = this.owner.lookup('service:store');
        const record = store.createRecord('comment', { content: 'hello', editable: true, subject_id: 'subj_1' });

        const json = record.serialize();

        assert.strictEqual(json.content, 'hello');
        assert.notOk('editable' in json, 'editable is suppressed');
        assert.notOk('subject_id' in json, 'subject_id is suppressed');
    });

    test('serialize suppresses belongsTo relationships and the replies hasMany', function (assert) {
        const store = this.owner.lookup('service:store');
        const json = store.createRecord('comment', {}).serialize();

        assert.notOk('author' in json, 'author belongsTo suppressed');
        assert.notOk('parent' in json, 'parent belongsTo suppressed');
        assert.notOk('replies' in json, 'replies hasMany suppressed');
    });
});

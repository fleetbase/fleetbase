import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';

module('Unit | Model | template | presentation', function (hooks) {
    setupTest(hooks);

    hooks.beforeEach(function () {
        this.store = this.owner.lookup('service:store');
    });

    test('isDraft and isPublished read the status', function (assert) {
        const draft = this.store.createRecord('template', { status: 'draft' });
        assert.true(draft.isDraft);
        assert.false(draft.isPublished);

        const published = this.store.createRecord('template', { status: 'published' });
        assert.false(published.isDraft);
        assert.true(published.isPublished);

        const archived = this.store.createRecord('template', { status: 'archived' });
        assert.false(archived.isDraft);
        assert.false(archived.isPublished);
    });

    test('dimensionLabel describes a custom size by its measurements', function (assert) {
        const custom = this.store.createRecord('template', { paper_size: 'custom', width: 210, height: 297, unit: 'mm' });

        assert.strictEqual(custom.dimensionLabel, '210 × 297 mm');
    });

    test('dimensionLabel describes a standard size by name and orientation', function (assert) {
        const standard = this.store.createRecord('template', { paper_size: 'A4', orientation: 'portrait' });

        assert.strictEqual(standard.dimensionLabel, 'A4 (portrait)');
    });
});

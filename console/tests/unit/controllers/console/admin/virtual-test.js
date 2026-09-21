import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';

module('Unit | Controller | console/admin/virtual', function (hooks) {
    setupTest(hooks);

    test('an item without layout options sits in the default centred column', function (assert) {
        const controller = this.owner.lookup('controller:console/admin/virtual');
        controller.model = { title: 'Branding' };

        assert.false(controller.isFullBleed);
        assert.strictEqual(controller.bodyClass, 'overflow-y-scroll h-full');
        assert.strictEqual(controller.containerClass, 'container mx-auto h-screen');
        assert.strictEqual(controller.wrapperClass, 'max-w-3xl my-10 mx-auto');
    });

    test('a wrapperClass alone is added to the default column', function (assert) {
        const controller = this.owner.lookup('controller:console/admin/virtual');
        controller.model = { wrapperClass: 'pb-12' };

        assert.false(controller.isFullBleed);
        assert.strictEqual(controller.wrapperClass, 'max-w-3xl my-10 mx-auto pb-12');
    });

    test('overwriteWrapperClass makes the item fill the page without page scrolling', function (assert) {
        const controller = this.owner.lookup('controller:console/admin/virtual');
        controller.model = { overwriteWrapperClass: true, wrapperClass: 'my-full-page' };

        assert.true(controller.isFullBleed);
        assert.strictEqual(controller.bodyClass, 'h-full');
        assert.strictEqual(controller.wrapperClass, 'my-full-page');

        controller.model = { overwriteWrapperClass: true };
        assert.strictEqual(controller.wrapperClass, 'flex flex-col flex-1 min-h-0 min-w-0');
    });
});

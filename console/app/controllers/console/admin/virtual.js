import Controller from '@ember/controller';
import { tracked } from '@glimmer/tracking';

/**
 * Renders an admin panel item registered by an extension. By default the item sits in a narrow
 * centred column. An item registered with `overwriteWrapperClass: true` instead fills the page and
 * manages its own scrolling, using its `wrapperClass` (or a full-height flex column) as the wrapper.
 * A `wrapperClass` without that flag is added to the default column.
 */
export default class ConsoleAdminVirtualController extends Controller {
    static DEFAULT_WRAPPER_CLASS = 'max-w-3xl my-10 mx-auto';
    static FULL_BLEED_WRAPPER_CLASS = 'flex flex-col flex-1 min-h-0 min-w-0';

    @tracked view;
    queryParams = ['view'];

    get isFullBleed() {
        return this.model?.overwriteWrapperClass === true;
    }

    get bodyClass() {
        return this.isFullBleed ? 'h-full' : 'overflow-y-scroll h-full';
    }

    get containerClass() {
        return 'container mx-auto h-screen';
    }

    get wrapperClass() {
        if (this.isFullBleed) {
            return this.model.wrapperClass || ConsoleAdminVirtualController.FULL_BLEED_WRAPPER_CLASS;
        }

        return [ConsoleAdminVirtualController.DEFAULT_WRAPPER_CLASS, this.model?.wrapperClass].filter(Boolean).join(' ');
    }
}

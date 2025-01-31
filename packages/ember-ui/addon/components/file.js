import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

export default class FileComponent extends Component {
    @tracked file;
    @tracked isImage = false;

    constructor(owner, { file }) {
        super(...arguments);

        this.file = file;
        this.isImage = this.isImageFile(file);
    }

    @action onDropdownItemClick(action, dd) {
        if (typeof dd.actions === 'object' && typeof dd.actions.close === 'function') {
            dd.actions.close();
        }

        if (typeof this.args[action] === 'function') {
            this.args[action](this.file);
        }
    }

    isImageFile(file) {
        if (!file || (!file.original_filename && !file.url && !file.path)) {
            return false;
        }

        const filename = file.original_filename || file.url || file.path;
        const extensionMatch = filename.match(/\.(.+)$/);

        if (!extensionMatch) {
            return false;
        }

        const extension = extensionMatch[1].toLowerCase();
        const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff', 'webp'];

        return imageExtensions.includes(extension);
    }
}

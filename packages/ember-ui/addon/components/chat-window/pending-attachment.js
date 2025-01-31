import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

export default class ChatWindowPendingAttachmentComponent extends Component {
    @tracked file;
    @tracked isImage = false;

    constructor(owner, { file }) {
        super(...arguments);

        this.file = file;
        this.isImage = this.isImageFile(file);
    }

    @action remove() {
        if (typeof this.args.onRemove === 'function') {
            this.args.onRemove(this.file);
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

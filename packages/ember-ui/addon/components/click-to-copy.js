import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

export default class ClickToCopyComponent extends Component {
    /**
     * Determines if user has copied text to clipboard
     *
     * @var {Boolean}
     */
    @tracked isCopied = false;

    /**
     * Copies the value to clipboard
     *
     * @void
     */
    @action copyToClipboard(value) {
        if (!navigator.clipboard) {
            return this.fallbackCopyToClipboard(value);
        }
        return navigator.clipboard.writeText(value).then(() => {
            this.isCopied = true;
        });
    }

    /**
     * Fallback copy to value to clipboard
     *
     * @void
     */
    @action fallbackCopyToClipboard(value) {
        const textArea = document.createElement('textarea');
        textArea.value = value;

        // Avoid scrolling to bottom
        textArea.style.top = '0';
        textArea.style.left = '0';
        textArea.style.position = 'fixed';

        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        try {
            document.execCommand('copy');
            this.isCopied = true;
        } catch (error) {
            console.error(error);
        }

        document.body.removeChild(textArea);
    }
}

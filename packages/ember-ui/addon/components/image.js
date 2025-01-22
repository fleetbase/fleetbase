import Component from '@glimmer/component';
import { action } from '@ember/object';
import { isBlank } from '@ember/utils';

export default class ImageComponent extends Component {
    @action setupComponent(element) {
        const { fallbackSrc } = this.args;

        if (isBlank(element.src) && fallbackSrc) {
            element.src = fallbackSrc;
        }
    }

    @action onError(event) {
        const { fallbackSrc } = this.args;

        if (fallbackSrc) {
            event.target.src = fallbackSrc;
        }
    }
}

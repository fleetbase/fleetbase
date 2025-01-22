import Component from '@glimmer/component';
import { action } from '@ember/object';

export default class ProgressBarComponent extends Component {
    @action setProgress(el, [percent]) {
        el.style.width = `${percent}%`;
    }
}

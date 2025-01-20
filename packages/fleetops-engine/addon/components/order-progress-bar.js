import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action, computed } from '@ember/object';
import { htmlSafe } from '@ember/template';

export default class OrderProgressBarComponent extends Component {
    @tracked progress = 0;
    @tracked order;

    @computed('progress') get progressionWidth() {
        return htmlSafe(`width: calc(${this.progress}% - 2rem);`);
    }

    @computed('progress') get iconPaddingLeft() {
        return htmlSafe(`padding-left: calc(${this.progress}% - 2rem);`);
    }

    constructor(owner, { order, progress = 0 }) {
        super(...arguments);
        this.order = order;
        this.progress = progress;
    }

    @action updateProgress(el, [progress = 0]) {
        this.progress = progress;
    }
}

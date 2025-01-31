import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

export default class FilterModelComponent extends Component {
    @tracked selectedModel;

    constructor() {
        super(...arguments);
        this.selectedModel = this.args.value;
    }

    @action onChange(selectedModel) {
        const { onChange, filter } = this.args;

        this.selectedModel = selectedModel;

        if (typeof onChange === 'function') {
            onChange(filter, selectedModel?.id);
        }
    }

    @action clear() {
        const { onClear, filter } = this.args;

        this.selectedModel = null;

        if (typeof onClear === 'function') {
            onClear(filter);
        }
    }
}

import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

export default class FilterCountryComponent extends Component {
    @tracked value;

    constructor() {
        super(...arguments);
        this.value = this.args.value;
    }

    @action onChange(selection) {
        const { onChange, filter } = this.args;

        this.value = selection;

        if (typeof onChange === 'function') {
            onChange(filter, selection);
        }
    }
}

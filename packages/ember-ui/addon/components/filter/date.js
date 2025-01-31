import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

export default class FilterDateComponent extends Component {
    @tracked value;

    constructor() {
        super(...arguments);
        this.value = this.args.value;
    }

    @action onChange({ date, formattedDate }) {
        const { onChange, onDateChange, filter } = this.args;

        this.value = formattedDate;

        if (typeof onChange === 'function') {
            onChange(filter, formattedDate);
        }

        if (typeof onDateChange === 'function') {
            onDateChange(filter, date);
        }
    }
}

import Component from '@glimmer/component';
import { action } from '@ember/object';

export default class FilterStringComponent extends Component {
    @action onChange({ target: { value } }) {
        const { onChange, filter } = this.args;

        if (typeof onChange === 'function') {
            onChange(filter, value);
        }
    }

    @action clear() {
        const { onClear, filter } = this.args;

        if (typeof onClear === 'function') {
            onClear(filter);
        }
    }
}

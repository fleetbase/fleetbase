import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

export default class SelectComponent extends Component {
    @tracked value;
    @tracked placeholder;
    @tracked disabled = false;

    constructor(owner, { value, placeholder, disabled = false }) {
        super(...arguments);
        this.value = value;
        this.placeholder = placeholder;
        this.disabled = disabled;
    }

    @action changed(el, [value, placeholder]) {
        this.value = value;
        this.placeholder = placeholder;
    }

    @action select(selectedOption) {
        // Ensure we always get the right value
        this.value = selectedOption?.code ?? selectedOption;
    
        if (typeof this.args.onSelect === 'function') {
            this.args.onSelect(this.value);
        }
    
        if (typeof this.args.onChange === 'function') {
            this.args.onChange(this.value);
        }
    }
}

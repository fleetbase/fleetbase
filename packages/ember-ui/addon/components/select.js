import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

export default class SelectComponent extends Component {
    @tracked value;
    @tracked placeholder;
    @tracked disabled = false;

    constructor() {
        super(...arguments);
        this.value = this.args.value;
        this.placeholder = this.args.placeholder;
        this.disabled = this.args.disabled ?? false;
    }

    formatKey(value) {
        if (typeof value === 'string') {
          return value.replace(/\s+/g, '-').toLowerCase();
        }
        return value;
      }

    @action changed([value, placeholder]) {
        this.value = value;
        this.placeholder = placeholder;
    }

    @action select(selectedOption) {
        if (selectedOption && typeof selectedOption === 'object') {
            this.value = selectedOption.code ?? selectedOption.id; // Prioritize `code`, fallback to `id`
        } else {
            this.value = selectedOption;
        }

        if (typeof this.args.onSelect === 'function') {
            this.args.onSelect(this.value);
        }
    
        if (typeof this.args.onChange === 'function') {
            this.args.onChange(this.value);
        }
    }
}
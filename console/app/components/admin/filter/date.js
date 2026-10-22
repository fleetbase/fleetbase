import Component from '@glimmer/component';
import { action } from '@ember/object';

export default class AdminFilterDateComponent extends Component {
    @action change(event) {
        this.args.onChange(this.args.filter, event.target.value);
    }
}

import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action, set } from '@ember/object';

export default class TableExpandableRowComponent extends Component {
    @tracked isExpanded = false;

    @action toggle() {
        this.isExpanded = !this.isExpanded;
        set(this.args.row, 'expanded', this.isExpanded);
    }

    @action expand() {
        this.isExpanded = true;
        set(this.args.row, 'expanded', this.isExpanded);
    }

    @action collapse() {
        this.isExpanded = false;
        set(this.args.row, 'expanded', this.isExpanded);
    }
}

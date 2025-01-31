import Component from '@glimmer/component';
import { action } from '@ember/object';

export default class TableCellUserNameComponent extends Component {
    @action onClick(event) {
        const { row, column, onClick } = this.args;

        if (typeof onClick === 'function') {
            onClick(row, event);
        }

        if (typeof column?.onClick === 'function') {
            column.onClick(row, event);
        }

        if (typeof column?.action === 'function') {
            column.action(row, event);
        }
    }
}

import Component from '@glimmer/component';
import { action } from '@ember/object';

export default class TableCellAnchorComponent extends Component {
    @action onClick() {
        const { column, row } = this.args;

        if (typeof column?.action === 'function') {
            column.action(row);
        }

        if (typeof column?.onClick === 'function') {
            column.onClick(row, ...arguments);
        }
    }
}

import Component from '@glimmer/component';
import { action, set } from '@ember/object';

export default class TableRowComponent extends Component {
    @action onClick(event) {
        const { onRowClick, onClick, row } = this.args;

        set(event, 'row', row);

        if (typeof onRowClick === 'function') {
            onRowClick(row);
        }

        if (typeof onClick === 'function') {
            onClick(event, row);
        }
    }
}

import Component from '@glimmer/component';
import { action, get, computed } from '@ember/object';

export default class CellFleetNameComponent extends Component {
    @computed('args.{column.modelPath,args.row}') get fleet() {
        const { column, row } = this.args;

        if (typeof column?.modelPath === 'string') {
            return get(row, column.modelPath);
        }

        return row;
    }

    @action onClick(fleet) {
        const { row, column, onClick } = this.args;

        if (typeof onClick === 'function') {
            onClick(fleet, row);
        }

        if (typeof column?.action === 'function') {
            column.action(fleet, row);
        }

        if (typeof column?.onClick === 'function') {
            column.onClick(fleet, row);
        }
    }
}

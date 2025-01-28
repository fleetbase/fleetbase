import Component from '@glimmer/component';
import { action, get, computed } from '@ember/object';

export default class CellDriverNameComponent extends Component {
    @computed('args.{column.modelPath,args.row}') get driver() {
        const { column, row } = this.args;

        if (typeof column?.modelPath === 'string') {
            return get(row, column.modelPath);
        }

        return row;
    }

    @action onClick(driver) {
        const { row, column, onClick } = this.args;

        if (typeof onClick === 'function') {
            onClick(driver, row);
        }

        if (typeof column?.action === 'function') {
            column.action(driver, row);
        }

        if (typeof column?.onClick === 'function') {
            column.onClick(driver, row);
        }
    }
}

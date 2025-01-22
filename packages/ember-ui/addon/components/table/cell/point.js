import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { isArray } from '@ember/array';
import { get, action } from '@ember/object';
import { later } from '@ember/runloop';

const isPoint = (point) => {
    return point && typeof point === 'object' && isArray(point.coordinates);
};

export default class TableCellPointComponent extends Component {
    @tracked display = '';
    @tracked isClickable = false;

    constructor(owner, { row, column }) {
        super(...arguments);
        this.isClickable = typeof column === 'object' && (typeof column.onClick === 'function' || typeof column.action === 'function');
        this.displayPointFromRow(row, column);
    }

    displayPointFromRow(row, column) {
        later(
            this,
            () => {
                const pointColumn = column.valuePath;

                if (pointColumn) {
                    const point = get(row, pointColumn);

                    if (isPoint(point)) {
                        this.display = `${point.coordinates[1]} ${point.coordinates[0]}`;
                    }
                }
            },
            50
        );
    }

    @action onClick() {
        const column = this.args.column;

        if (column) {
            const { onClick, action } = column;

            if (typeof onClick === 'function') {
                onClick(this.args.row, ...arguments);
            }

            if (typeof action === 'function') {
                action(this.args.row);
            }
        }
    }
}

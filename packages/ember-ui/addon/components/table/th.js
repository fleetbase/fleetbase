import TableCellComponent from './cell';
import { action } from '@ember/object';

export default class TableThComponent extends TableCellComponent {
    @action setupComponent(tableCellNode) {
        this.tableCellNode = tableCellNode;
        this.setupTableCellNode(tableCellNode);
    }

    @action setupTableCellNode(tableCellNode) {
        const { column, width } = this.args;

        if (column?.width) {
            tableCellNode.style.width = typeof column.width === 'number' ? `${column.width}px` : column.width;
        }

        if (width) {
            tableCellNode.style.width = typeof width === 'number' ? `${width}px` : width;
        }
    }
}

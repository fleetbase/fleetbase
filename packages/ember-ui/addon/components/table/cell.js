import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

export default class TableCellComponent extends Component {
    @tracked tableCellNode;

    @action setupComponent(tableCellNode) {
        this.tableCellNode = tableCellNode;
    }

    @action getOwnerTable(tableCellNode) {
        while (tableCellNode) {
            tableCellNode = tableCellNode.parentNode;

            if (tableCellNode.tagName.toLowerCase() === 'table') {
                return tableCellNode;
            }
        }

        return undefined;
    }
}

import Component from '@glimmer/component';
import { action, computed } from '@ember/object';

export default class TableCellDropdownComponent extends Component {
    defaultButtonText = 'Actions';

    @computed('args.column.ddButtonText', 'defaultButtonText') get buttonText() {
        const { ddButtonText } = this.args.column;

        if (ddButtonText === undefined) {
            return this.defaultButtonText;
        }

        if (ddButtonText === false) {
            return null;
        }

        return ddButtonText;
    }

    @action setupComponent(dropdownWrapperNode) {
        const tableCellNode = this.getOwnerTableCell(dropdownWrapperNode);
        tableCellNode.style.overflow = 'visible';
    }

    @action getOwnerTableCell(dropdownWrapperNode) {
        while (dropdownWrapperNode) {
            dropdownWrapperNode = dropdownWrapperNode.parentNode;

            if (dropdownWrapperNode.tagName.toLowerCase() === 'td') {
                return dropdownWrapperNode;
            }
        }

        return undefined;
    }

    @action onDropdownItemClick(columnAction, row, dd) {
        if (typeof dd?.actions?.close === 'function') {
            dd.actions.close();
        }

        if (typeof columnAction?.fn === 'function') {
            columnAction.fn(row);
        }
    }

    @action calculatePosition(trigger) {
        let { width } = trigger.getBoundingClientRect();

        let style = {
            marginTop: '0px',
            right: width + 3,
            top: 0,
        };

        return { style };
    }
}

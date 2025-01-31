import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

export default class TableCellResizerComponent extends Component {
    @tracked tableCellNode;
    @tracked resizerNode;
    @tracked x;
    @tracked w;

    @action setupComponent(resizerNode) {
        const { parentNode } = resizerNode;

        this.resizerNode = resizerNode;
        this.tableCellNode = parentNode;
        this.setupResizerNode(resizerNode);
        this.setupTableCellNode(parentNode);
    }

    @action setupTableCellNode(tableCellNode) {
        tableCellNode.style.position = 'relative';
        tableCellNode.setAttribute('nowrap', '');
    }

    @action setupResizerNode(resizerNode) {
        const table = this.getOwnerTable(resizerNode);
        resizerNode.style.height = `${table.offsetHeight}px`;
    }

    @action getOwnerTable(resizerNode) {
        while (resizerNode) {
            resizerNode = resizerNode.parentNode;

            if (resizerNode.tagName.toLowerCase() === 'table') {
                return resizerNode;
            }
        }

        return undefined;
    }

    @action onMouseDown(e) {
        this.resizerNode.classList.add('resizing');
        this.x = e.clientX;

        const styles = window.getComputedStyle(this.tableCellNode);
        this.w = parseInt(styles.width, 10);

        document.addEventListener('mousemove', this.onMouseMove);
        document.addEventListener('mouseup', this.onMouseUp);
    }

    @action onMouseMove(e) {
        const dx = e.clientX - this.x;

        this.tableCellNode.style.width = `${this.w + dx}px`;
    }

    @action onMouseUp() {
        this.resizerNode.classList.remove('resizing');

        document.removeEventListener('mousemove', this.onMouseMove);
        document.removeEventListener('mouseup', this.onMouseUp);
    }
}

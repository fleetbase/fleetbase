import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { isBlank } from '@ember/utils';
import { later } from '@ember/runloop';

export default class TableFootComponent extends Component {
    @tracked tfootVerticalOffset;
    @tracked tfootVerticalOffsetElements;
    @tracked ready;

    constructor(owner, { tfootVerticalOffset, tfootVerticalOffsetElements }) {
        super(...arguments);

        this.tfootVerticalOffsetElements = tfootVerticalOffsetElements;
        this.tfootVerticalOffset = tfootVerticalOffset;

        later(
            this,
            () => {
                if (isBlank(this.tfootVerticalOffsetElements) && isBlank(this.tfootVerticalOffset)) {
                    this.tfootVerticalOffset = this.calculateTableFooterVerticalOffset();
                }

                this.ready = true;
            },
            0
        );
    }

    calculateTableFooterVerticalOffset() {
        const offsetElements = ['#next-view-section-subheader', '.next-table-wrapper > table > thead'];
        const offsetContant = 7;
        let calculatedOffset = 0;

        for (let i = 0; i < offsetElements.length; i++) {
            const element = offsetElements.objectAt(i);

            if (element instanceof HTMLElement) {
                calculatedOffset += element.offsetHeight;
            }

            if (typeof element === 'string') {
                const foundElement = document.querySelector(element);

                if (foundElement instanceof HTMLElement) {
                    calculatedOffset += foundElement.offsetHeight;
                }
            }
        }

        return calculatedOffset + offsetContant;
    }
}

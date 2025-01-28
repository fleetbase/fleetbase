import Component from '@glimmer/component';
import { action } from '@ember/object';

export default class OrderListOverlayOrderComponent extends Component {
    @action onClick(order, event) {
        //Don't run callback if action button is clicked
        if (event.target.closest('span.order-listing-action-button')) {
            event.stopPropagation();
            event.preventDefault();
            return;
        }

        if (typeof this.args.onClick === 'function') {
            this.args.onClick(...arguments);
        }
    }

    @action onDoubleClick() {
        if (typeof this.args.onDoubleClick === 'function') {
            this.args.onDoubleClick(...arguments);
        }
    }

    @action onMouseEnter() {
        if (typeof this.args.onMouseEnter === 'function') {
            this.args.onMouseEnter(...arguments);
        }
    }

    @action onMouseLeave() {
        if (typeof this.args.onMouseLeave === 'function') {
            this.args.onMouseLeave(...arguments);
        }
    }
}

import Component from '@glimmer/component';
import { action } from '@ember/object';

export default class AsideItemScrollerItemComponent extends Component {
    @action onClick() {
        const { onClick } = this.args;

        if (typeof onClick === 'function') {
            onClick(...arguments);
        }
    }
}

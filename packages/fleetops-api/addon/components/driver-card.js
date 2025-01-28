import Component from '@glimmer/component';
import { action } from '@ember/object';

export default class DriverCardComponent extends Component {
    @action setupComponent() {}

    @action onClick() {
        const { driver, onClick } = this.args;

        if (typeof onClick === 'function') {
            onClick(driver, ...arguments);
        }
    }
}

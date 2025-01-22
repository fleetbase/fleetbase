import Component from '@glimmer/component';
import { action } from '@ember/object';

export default class ModalTitleWithButtonsComponent extends Component {
    @action handler(option, dd) {
        if (typeof dd?.actions?.close === 'function') {
            dd.actions.close();
        }

        if (typeof option.action === 'function') {
            option.action();
        }
    }
}

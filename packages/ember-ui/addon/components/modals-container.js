import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';

export default class ModalsContainer extends Component {
    @service modalsManager;

    /**
     * @category Action Handlers
     */
    @action confirm() {
        this.modalsManager.onClickConfirmWithDone(...arguments);
    }

    /**
     * @category Action Handlers
     */
    @action decline() {
        this.modalsManager.onClickDeclineWithDone(...arguments);
    }
}

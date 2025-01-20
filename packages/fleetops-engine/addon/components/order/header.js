import Component from '@glimmer/component';
import { action } from '@ember/object';
import { classify } from '@ember/string';
import isFunction from '@fleetbase/ember-core/utils/is-function';

export default class OrderHeaderComponent extends Component {
    /**
     * Forwards action up the component via callback arguments
     *
     * @param {String} forwardedAction the name of the action to send up
     * @void
     */
    @action
    forwardAction(forwardedAction, dd) {
        const { order } = this.args;
        const actionName = `on${classify(forwardedAction)}`;

        if (dd && isFunction(dd.actions.close)) {
            dd.actions.close();
        }

        if (typeof this.args[actionName] === 'function') {
            this.args[actionName](order);
        }
    }
}

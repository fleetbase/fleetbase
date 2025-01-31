import Component from '@glimmer/component';
import { action } from '@ember/object';
import { classify } from '@ember/string';

export default class OrderConfigDetailsEditorComponent extends Component {
    @action sendAction(action) {
        const actionName = `on${classify(action)}`;
        const params = [...arguments];

        params.shift();

        if (typeof this.args[actionName] === 'function') {
            this.args[actionName](...params);
        }
    }
}

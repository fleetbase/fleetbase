import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { underscore } from '@ember/string';
import generateUuid from '@fleetbase/ember-core/utils/generate-uuid';

export default class KeyInputComponent extends Component {
    @tracked value;
    @tracked id = generateUuid();

    constructor() {
        super(...arguments);

        this.value = this.args.value;
    }

    @action formatKey({ target: { value } }) {
        this.setValue(value);
    }

    @action blur({ target: { value } }) {
        this.setValue(value, 'onBlur');
    }

    @action setValue(value, callbackName = 'onChange') {
        this.value = underscore(value);

        if (typeof this.args[callbackName] === 'function') {
            this.args[callbackName](this.value);
        }
    }
}

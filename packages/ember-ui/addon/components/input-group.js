import Component from '@glimmer/component';
import { camelize } from '@ember/string';
import { guidFor } from '@ember/object/internals';

export default class InputGroupComponent extends Component {
    /**
     * Get the form group id and for
     *
     * @var {String}
     */
    get id() {
        return `${camelize(typeof this.args.name === 'string' ? this.args.name.replace(/\/|\./g, '') : '')}_${this.randomId}`;
    }

    /**
     * Get a randomly generated id for form-group
     *
     * @var {String}
     */
    get randomId() {
        return guidFor(this);
    }
}

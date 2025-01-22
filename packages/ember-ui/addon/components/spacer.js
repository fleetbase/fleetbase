import Component from '@glimmer/component';
import { action } from '@ember/object';
import { camelize } from '@ember/string';

export default class SpacerComponent extends Component {
    @action createSpacer(spacerElement) {
        const properties = Object.keys(this.args);

        for (let index = 0; index < properties.length; index++) {
            const prop = properties[index];

            if (typeof this.args[prop] === 'string' || !isNaN(this.args[prop])) {
                spacerElement.style[camelize(prop)] = this.args[prop];
            }
        }
    }
}

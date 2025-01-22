import Helper from '@ember/component/helper';
import { getOwner } from '@ember/application';

/**
 * Checks if a registration exists in the ApplicationInstance container registry.
 * Usage: `(has-registration 'component:my-component')` or `(has-registration 'my-component' 'component')`
 *
 * @export
 * @class HasRegistrationHelper
 * @extends {Helper}
 */
export default class HasRegistrationHelper extends Helper {
    compute(params) {
        let [name, type] = params;
        if (type) {
            name = `${type}:${name}`;
        }
        const owner = getOwner(this);
        return owner && owner.hasRegistration(name);
    }
}

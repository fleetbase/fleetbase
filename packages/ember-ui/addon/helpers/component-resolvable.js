import Helper from '@ember/component/helper';
import { getOwner } from '@ember/application';

export default class ComponentResolvableHelper extends Helper {
    compute(params) {
        const [componentName] = params;
        const owner = getOwner(this);
        return owner && owner.hasRegistration(`component:${componentName}`);
    }
}

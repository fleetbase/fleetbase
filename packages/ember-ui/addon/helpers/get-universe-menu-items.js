import Helper from '@ember/component/helper';
import { getOwner } from '@ember/application';

export default class GetUniverseMenuItemsHelper extends Helper {
    compute(params) {
        const [registryName] = params;
        const owner = getOwner(this);
        if (owner) {
            const universe = owner.lookup('service:universe');
            if (universe) {
                return universe.getMenuItemsFromRegistry(registryName);
            }
        }

        return [];
    }
}

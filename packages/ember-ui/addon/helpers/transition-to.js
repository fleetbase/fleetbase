import Helper from '@ember/component/helper';
import { getOwner } from '@ember/application';
import { isBlank, typeOf } from '@ember/utils';
import { assert } from '@ember/debug';

export default class TransitionToHelper extends Helper {
    routerInjection = 'router:main';
    transitionMethod = 'transitionTo';

    getRouteName(routeName, mountPoint) {
        return prefixMountPoint(mountPoint, routeName);
    }

    compute(params, hash = {}) {
        let [route, ...args] = params;
        const queryParams = hash.queryParams;

        return () => {
            const owner = getOwner(this);
            const router = owner.lookup(this.routerInjection);
            const mountPoint = getMountPoint(owner);
            const routeName = this.getRouteName(route, mountPoint);

            if (queryParams) {
                router.transitionTo(routeName, ...args, { queryParams });
            } else {
                router.transitionTo(routeName, ...args);
            }
        };
    }
}

function prefixMountPoint(mountPoint, propValue) {
    if (typeOf(propValue) !== 'string') {
        assert('propValue argument must be an string', typeOf(propValue) !== 'string');
    }

    if (typeOf(mountPoint) !== 'string' || isBlank(mountPoint)) {
        return propValue;
    }

    if (propValue === 'application') {
        return mountPoint;
    }

    return `${mountPoint}.${propValue}`;
}

function getMountPoint(owner) {
    if (owner && typeof owner.mountPoint === 'string') {
        return owner.mountPoint;
    }

    return false;
}

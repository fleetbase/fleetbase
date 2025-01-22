import { get } from '@ember/object';

export default function isNestedRouteTransition(transition) {
    const toRoute = get(transition, 'to.name');
    const fromRouteParent = get(transition, 'from.parent.name');
    const toRouteParent = get(transition, 'to.parent.name');
    const isNested = toRoute.startsWith(fromRouteParent);
    const isMatchingParents = fromRouteParent && toRouteParent && fromRouteParent === toRouteParent;

    return isNested || isMatchingParents;
}

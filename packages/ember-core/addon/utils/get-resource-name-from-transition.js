import humanize from './humanize';

export default function getResourceNameFromTransition(transition, options = {}) {
    const { to } = transition;

    if (typeof to.name === 'string') {
        let routePathSegments = to.name.split('.');
        let resourceName = routePathSegments[3];

        if (options.humanize === true) {
            return humanize(resourceName);
        }

        return resourceName;
    }

    return null;
}

import config from 'ember-get-config';

export function initialize(owner) {
    const universe = owner.lookup('service:universe');

    if (universe) {
        universe.registerOrganizationMenuItem(`v${config.version}`, {
            index: 4,
            route: null,
            icon: 'code-branch',
            iconSize: 'xs',
            iconClass: 'mr-1.5',
            wrapperClass: 'app-version-in-nav',
            overwriteWrapperClass: true,
        });
    }
}

export default {
    initialize,
};

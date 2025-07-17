import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { isArray } from '@ember/array';
import { getOwner } from '@ember/application';
import config from 'ember-get-config';

/**
 * Layout header component.
 *
 * @export
 * @class LayoutHeaderComponent
 * @extends {Component}
 */
export default class LayoutHeaderComponent extends Component {
    @service store;
    @service router;
    @service hostRouter;
    @service universe;
    @service currentUser;
    @service abilities;
    @service fetch;
    @service intl;
    @tracked company;
    @tracked menuItems = [];
    @tracked organizationMenuItems = [];
    @tracked userMenuItems = [];
    @tracked extensions = [];

    constructor(owner, { menuItems = [], organizationMenuItems = [], userMenuItems = [] }) {
        super(...arguments);
        this.extensions = getOwner(this).application.extensions ?? [];
        this.company = this.currentUser.getCompany();
        this.menuItems = this.mergeMenuItems(menuItems);
        this.organizationMenuItems = this.mergeOrganizationMenuItems(organizationMenuItems);
        this.userMenuItems = this.mergeUserMenuItems(userMenuItems);
    }

    mergeMenuItems(menuItems = []) {
        const headerMenuItems = this.universe.headerMenuItems;
        const visibleMenuItems = [];
        for (let i = 0; i < headerMenuItems.length; i++) {
            const menuItem = headerMenuItems[i];
            if (this.abilities.can(`${menuItem.id} see extension`)) {
                visibleMenuItems.pushObject(menuItem);
            }
        }
        // Merge additionals
        visibleMenuItems.pushObjects(menuItems);

        // Callback to allow mutation of menu items
        if (typeof this.args.mutateMenuItems === 'function') {
            this.args.mutateMenuItems(menuItems);
        }

        return visibleMenuItems;
    }

    mergeOrganizationMenuItems(organizationMenuItems = []) {
        // Prepare menuItems
        const menuItems = [
            {
                text: [
                    this.currentUser.companyName,
                    this.currentUser.name,
                    { component: 'badge', disableHumanize: true, text: this.currentUser.roleName, status: 'info', hideStatusDot: false, wrapperClass: 'mt-1' },
                ],
                class: 'flex flex-row items-center px-3 rounded-md text-gray-800 text-sm dark:text-gray-300 leading-1',
                wrapperClass: 'next-dd-session-user-wrapper',
            },
        ];

        // List available organizations for session switching
        const organizations = this.currentUser.organizations;
        if (organizations.length) {
            menuItems.pushObject({ seperator: true });
        }
        for (let i = 0; i < organizations.length; i++) {
            const organization = organizations.objectAt(i);
            const organizationMenuItem = {
                href: 'javascript:;',
                text: organization.name,
                action: 'switchOrganization',
                params: [organization],
            };

            // If current organization
            if (this.currentUser.companyId === organization.id) {
                organizationMenuItem.icon = 'check';
                organizationMenuItem.disabled = true;
                organizationMenuItem.action = undefined;
            }

            menuItems.pushObject(organizationMenuItem);
        }
        const staticMenuItems = [
            {
                seperator: true,
            },
        ];

        // Push "organization-settings" only if user is NOT a driver
        if (this.currentUser.roleName?.toLowerCase() !== 'driver') {
            staticMenuItems.pushObject({
                id: 'organization-settings',
                route: 'console.settings.index',
                text: this.intl.t('layout.header.menus.organization.settings'),
                icon: 'gear',
            });
        }

        // Push static menu items
        // const staticMenuItems = [
        //     {
        //         seperator: true,
        //     },
            // {
            //     id: 'console-home',
            //     route: 'console.home',
            //     text: 'Home',
            //     icon: 'house',
            // },
            // {
            //     id: 'organization-settings',
            //     route: 'console.settings.index',
            //     text: this.intl.t('layout.header.menus.organization.settings'),
            //     icon: 'gear',
            // },
            // {
            //     id: 'create-or-join-organizations',
            //     href: 'javascript:;',
            //     text: 'Create or join organizations',
            //     action: 'createOrJoinOrg',
            //     icon: 'building',
            // },
        // ];

        // If registry bridge is booted add to static items
        // if (this.hasExtension('@fleetbase/registry-bridge-engine')) {
        //     staticMenuItems.pushObject({
        //         id: 'explore-extensions',
        //         route: 'console.extensions',
        //         text: 'Explore extensions',
        //         icon: 'puzzle-piece',
        //     });
        // }

        // Push static items
        menuItems.pushObjects(staticMenuItems);

        // Merge provided menu items
        menuItems.pushObjects(organizationMenuItems);

        // Push items from universe registry
        const universeOrganizationItems = this.universe.organizationMenuItems;
        if (isArray(universeOrganizationItems) && universeOrganizationItems.length) {
            menuItems.pushObjects([
                {
                    seperator: true,
                },
                ...universeOrganizationItems,
                {
                    seperator: true,
                },
            ]);
        }

        // Push the version
        // menuItems.pushObject({
        //     id: 'app-version',
        //     route: null,
        //     text: `v${config.version}`,
        //     icon: 'code-branch',
        //     iconSize: 'xs',
        //     iconClass: 'mr-1.5',
        //     wrapperClass: 'app-version-in-nav',
        //     overwriteWrapperClass: true,
        // });

        // Merge admin link
        if (this.currentUser.isAdmin) {
            menuItems.pushObjects([
                {
                    seperator: true,
                },
                {
                    route: 'console.admin',
                    text: this.intl.t('common.admin'),
                    icon: 'toolbox',
                },
            ]);
        }

        // Merge logout link
        menuItems.pushObjects([
            {
                seperator: true,
            },
            {
                href: 'javascript:;',
                text: this.intl.t('common.logout'),
                action: 'invalidateSession',
                icon: 'person-running',
            },
        ]);

        // Callback to allow mutation of menu items
        if (typeof this.args.mutateOrganizationMenuItems === 'function') {
            this.args.mutateOrganizationMenuItems(menuItems);
        }

        return menuItems;
    }

    mergeUserMenuItems(userMenuItems = []) {
        // Prepare menu items
        const menuItems = [
            {
                text: [this.currentUser.name, { component: 'badge', disableHumanize: true, text: this.currentUser.roleName, status: 'info', hideStatusDot: false, wrapperClass: 'mt-1' }],
                class: 'flex flex-row items-center px-3 rounded-md text-gray-800 text-sm dark:text-gray-300 leading-1',
                wrapperClass: 'next-dd-session-user-wrapper',
            },
            {
                seperator: true,
            },
            {
                id: 'view-profile-user-nav-item',
                wrapperClass: 'view-profile-user-nav-item',
                route: 'console.account.index',
                text: this.intl.t('fleet-ops.common.view-profile'),
            },
            // {
            //     id: 'show-keyboard-shortcuts-user-nav-item',
            //     wrapperClass: 'show-keyboard-shortcuts-user-nav-item',
            //     href: 'javascript:;',
            //     text: 'Show keyboard shortcuts',
            //     disabled: true,
            //     action: 'showKeyboardShortcuts',
            // },
            // {
            //     seperator: true,
            // },
            // {
            //     id: 'changelog-user-nav-item',
            //     wrapperClass: 'changelog-user-nav-item',
            //     href: 'javascript:;',
            //     text: 'Changelog',
            //     action: 'viewChangelog',
            // },
        ];

        // Add developer menu item if booted
        // if (this.hasExtension('@fleetbase/dev-engine')) {
        //     menuItems.pushObject({
        //         id: 'developers-user-nav-item',
        //         wrapperClass: 'developers-user-nav-item',
        //         route: 'console.developers',
        //         text: 'Developers',
        //     });
        // }

        // Add more static menu items
        const supportMenuItems = [
            // {
            //     id: 'discord',
            //     href: 'https://discord.gg/MJQgxHwN',
            //     target: '_discord',
            //     text: 'Join Discord Community',
            //     icon: 'arrow-up-right-from-square',
            // },
            // {
            //     id: 'support-user-nav-item',
            //     wrapperClass: 'support-user-nav-item',
            //     href: 'https://github.com/fleetbase/fleetbase/issues',
            //     target: '_support',
            //     text: 'Help & Support',
            //     icon: 'arrow-up-right-from-square',
            // },
            // {
            //     id: 'docs-user-nav-item',
            //     wrapperClass: 'docs-user-nav-item',
            //     href: 'https://docs.fleetbase.io',
            //     target: '_docs',
            //     text: 'Documentation',
            //     icon: 'arrow-up-right-from-square',
            // },
        ];

        // Push support menu items
        menuItems.pushObjects(supportMenuItems);

        // Push provided menu items
        menuItems.pushObjects(userMenuItems);

        // Create immutable static menu items
        menuItems.pushObjects([
            {
                component: 'layout/header/dark-mode-toggle',
            },
            {
                seperator: true,
            },
            {
                href: 'javascript:;',
                text: this.intl.t('common.logout'),
                action: 'invalidateSession',
                icon: 'person-running',
            },
        ]);

        // Callback to allow mutation of menu items
        if (typeof this.args.mutateUserMenuItems === 'function') {
            this.args.mutateUserMenuItems(menuItems);
        }

        return menuItems;
    }

    @action routeTo(route) {
        const router = this.router ?? this.hostRouter;

        return router.transitionTo(route);
    }

    hasExtension(extensionName) {
        return this.extensions.find(({ name }) => name === extensionName) !== undefined;
    }
}

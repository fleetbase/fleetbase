import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { getOwner } from '@ember/application';
import { action } from '@ember/object';

export default class LayoutMobileNavbarComponent extends Component {
    @service router;
    @service hostRouter;
    @service abilities;
    @service universe;
    @tracked navbarNode;
    @tracked sidebarNode;
    @tracked extensions = [];
    @tracked menuItems = [];

    constructor(owner, { menuItems = [] }) {
        super(...arguments);
        this.extensions = getOwner(this).application.extensions ?? [];
        this.menuItems = this.mergeMenuItems(menuItems);
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

    @action setupMobileNavbar(element) {
        this.navbarNode = element;
        this.sidebarNode = element.previousElementSibling.querySelector('nav.next-sidebar');

        if (typeof this.args.onSetup === 'function') {
            this.onSetup(this);
        }

        // when hostrouter transitions close sidebar automatically
        this.getRouter().on('routeDidChange', this.closeSidebar.bind(this));
    }

    @action routeTo(route) {
        this.getRouter()
            .transitionTo(route)
            .then(() => {
                this.closeSidebar();
            });
    }

    @action toggleSidebar() {
        if (this.isSidebarOpen()) {
            this.closeSidebar();
        } else {
            this.openSidebar();
        }
    }

    @action isSidebarOpen() {
        return this.sidebarNode?.classList?.contains('is-open');
    }

    @action closeSidebar() {
        this.sidebarNode?.classList?.remove('is-open');
    }

    @action openSidebar() {
        this.sidebarNode?.classList?.add('is-open');
    }

    getRouter() {
        return this.router ?? this.hostRouter;
    }
}

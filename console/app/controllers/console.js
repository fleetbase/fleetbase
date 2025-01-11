import Controller from '@ember/controller';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { later } from '@ember/runloop';
import { action } from '@ember/object';
import { isArray } from '@ember/array';
import first from '@fleetbase/ember-core/utils/first';

export default class ConsoleController extends Controller {
    @service currentUser;
    @service modalsManager;
    @service session;
    @service fetch;
    @service notifications;
    @service router;
    @service intl;
    @service universe;
    @service abilities;

    /**
     * Authenticated user organizations.
     *
     * @var {Array}
     */
    @tracked organizations = [];

    /**
     * Sidebar Context Controls
     *
     * @var {SidebarContext}
     */
    @tracked sidebarContext;

    /**
     * State of sidebar toggle icon
     *
     * @var {SidebarContext}
     */
    @tracked sidebarToggleEnabled = true;

    /**
     * The sidebar toggle state.
     *
     * @var {SidebarContext}
     */
    @tracked sidebarToggleState = {};

    /**
     * Routes which should hide the sidebar menu.
     *
     * @var {Array}
     */
    @tracked hiddenSidebarRoutes = ['console.home', 'console.notifications', 'console.virtual'];

    /**
     * Menu items to be added to the main header navigation bar.
     *
     * @memberof ConsoleController
     */
    @tracked menuItems = [];

    /**
     * Menu items to be added to the user dropdown menu located in the header.
     *
     * @memberof ConsoleController
     */
    @tracked userMenuItems = [];

    /**
     * Menu items to be added to the organization dropdown menu located in the header.
     *
     * @memberof ConsoleController
     */
    @tracked organizationMenuItems = [];

    /**
     * Creates an instance of ConsoleController.
     * @memberof ConsoleController
     */
    constructor() {
        super(...arguments);
        this.router.on('routeDidChange', (transition) => {
            if (this.sidebarContext) {
                // Determine if the new route should hide the sidebar
                const shouldHideSidebar = this.hiddenSidebarRoutes.includes(transition.to.name);

                // Check if the sidebar was manually toggled and is currently closed
                const isSidebarManuallyClosed = this.sidebarToggleState.clicked && !this.sidebarToggleState.isOpen;

                // Hide the sidebar if the current route is in hiddenSidebarRoutes
                if (shouldHideSidebar) {
                    this.sidebarContext.hideNow();
                    this.sidebarToggleEnabled = false;
                    return; // Exit early as no further action is required
                }

                // If the sidebar was manually closed and not on a hidden route, keep it closed
                if (isSidebarManuallyClosed) {
                    this.sidebarContext.hideNow();
                } else {
                    // Otherwise, show the sidebar
                    this.sidebarContext.show();
                }

                // Ensure toggle is enabled unless on a hidden route
                this.sidebarToggleEnabled = !shouldHideSidebar;
            }
        });
    }

    /**
     * When sidebar is manually toggled
     *
     * @param {SidebarContext} sidebar
     * @param {boolean} isOpen
     * @memberof ConsoleController
     */
    @action onSidebarToggle(sidebar, isOpen) {
        this.sidebarToggleState = {
            clicked: true,
            isOpen,
        };
    }

    /**
     * Sets the sidebar context
     *
     * @param {SidebarContext} sidebarContext
     * @memberof ConsoleController
     */
    @action setSidebarContext(sidebarContext) {
        this.sidebarContext = sidebarContext;
        this.universe.sidebarContext = sidebarContext;
        this.universe.trigger('sidebarContext.available', sidebarContext);

        if (this.hiddenSidebarRoutes.includes(this.router.currentRouteName)) {
            this.sidebarContext.hideNow();
            this.sidebarToggleEnabled = false;
        }
    }

    /**
     * Action handler.
     *
     * @void
     */
    @action onAction(action, ...params) {
        if (typeof this[action] === 'function') {
            this[action](...params);
        }
    }

    /**
     * Action to invalidate and log user out
     *
     * @void
     */
    @action async invalidateSession(noop, event) {
        event.preventDefault();
        await this.session.invalidateWithLoader();
    }

    /**
     * Action to create or join an organization.
     *
     * @void
     */
    @action createOrJoinOrg() {
        const currency = this.currentUser.currency;
        const country = this.currentUser.country;

        this.modalsManager.show('modals/create-or-join-org', {
            title: this.intl.t('console.create-or-join-organization.modal-title'),
            acceptButtonText: this.intl.t('common.confirm'),
            acceptButtonIcon: 'check',
            acceptButtonIconPrefix: 'fas',
            action: 'join',
            next: null,
            name: null,
            decription: null,
            phone: null,
            currency,
            country,
            timezone: null,
            changeAction: (action) => {
                this.modalsManager.setOption('action', action);
            },
            confirm: async (modal) => {
                modal.startLoading();

                const { action, next, name, description, phone, currency, country, timezone } = modal.getOptions();

                if (action === 'join') {
                    try {
                        await this.fetch.post('auth/join-organization', { next });
                        this.fetch.flushRequestCache('auth/organizations');
                        this.notifications.success(this.intl.t('console.create-or-join-organization.join-success-notification'));
                        return later(
                            this,
                            () => {
                                window.location.reload();
                            },
                            900
                        );
                    } catch (error) {
                        modal.stopLoading();
                        return this.notifications.serverError(error);
                    }
                }

                try {
                    await this.fetch.post('auth/create-organization', {
                        name,
                        description,
                        phone,
                        currency,
                        country,
                        timezone,
                    });
                    this.fetch.flushRequestCache('auth/organizations');
                    this.notifications.success(this.intl.t('console.create-or-join-organization.create-success-notification'));
                    return later(
                        this,
                        () => {
                            window.location.reload();
                        },
                        900
                    );
                } catch (error) {
                    modal.stopLoading();
                    return this.notifications.serverError(error);
                }
            },
        });
    }

    /**
     * Confirm prompt for user to switch organization
     *
     * @void
     */
    @action switchOrganization(organization) {
        if (isArray(organization)) {
            organization = first(organization);
        }

        this.modalsManager.confirm({
            title: this.intl.t('console.switch-organization.modal-title', { organizationName: organization.name }),
            body: this.intl.t('console.switch-organization.modal-body'),
            acceptButtonText: this.intl.t('console.switch-organization.modal-accept-button-text'),
            acceptButtonScheme: 'primary',
            confirm: async (modal) => {
                modal.startLoading();

                try {
                    await this.fetch.post('auth/switch-organization', { next: organization.uuid });
                    this.fetch.flushRequestCache('auth/organizations');
                    this.notifications.success(this.intl.t('console.switch-organization.success-notification'));
                    return later(
                        this,
                        () => {
                            window.location.reload();
                        },
                        900
                    );
                } catch (error) {
                    modal.stopLoading();
                    return this.notifications.serverError(error);
                }
            },
        });
    }

    @action viewChangelog() {
        this.modalsManager.show('modals/changelog', {
            title: this.intl.t('common.changelog'),
            acceptButtonText: this.intl.t('common.ok'),
            hideDeclineButton: true,
        });
    }
}

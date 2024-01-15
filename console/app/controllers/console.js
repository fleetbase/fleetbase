import Controller from '@ember/controller';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { getOwner } from '@ember/application';
import { later } from '@ember/runloop';
import { action, computed } from '@ember/object';
import { alias } from '@ember/object/computed';
import { isArray } from '@ember/array';
import first from '@fleetbase/ember-core/utils/first';

export default class ConsoleController extends Controller {
    /**
     * Inject the `currentUser` service.
     *
     * @var {Service}
     */
    @service currentUser;

    /**
     * Inject the `modalsManager` service.
     *
     * @var {Service}
     */
    @service modalsManager;

    /**
     * Inject the `session` service.
     *
     * @var {Service}
     */
    @service session;

    /**
     * Inject the `fetch` service.
     *
     * @var {Service}
     */
    @service fetch;

    /**
     * Inject the `notifications` service.
     *
     * @var {Service}
     */
    @service notifications;

    /**
     * Inject the `router` service.
     *
     * @var {Service}
     */
    @service router;

    /**
     * Inject the `universe` service.
     *
     * @var {Service}
     */
    @service universe;

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
    @tracked hiddenSidebarRoutes = ['console.home', 'console.extensions', 'console.notifications'];

    /**
     * Installed extensions.
     *
     * @var {Array}
     */
    @computed() get extensions() {
        return getOwner(this).application.extensions;
    }

    /**
     * Get the currently authenticated user
     *
     * @var {Model}
     */
    @alias('currentUser.user') user;

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
    @action invalidateSession(noop, event) {
        event.preventDefault();
        this.session.invalidateWithLoader();
    }

    /**
     * Action to invalidate and log user out
     *
     * @void
     */
    @action createOrJoinOrg() {
        const currency = this.currentUser.currency;
        const country = this.currentUser.country;

        this.modalsManager.show('modals/create-or-join-org', {
            title: 'Create or join a organization',
            acceptButtonText: 'Confirm',
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
            confirm: (modal) => {
                modal.startLoading();

                const { action, next, name, description, phone, currency, country, timezone } = modal.getOptions();

                if (action === 'join') {
                    return this.fetch.post('auth/join-organization', { next }).then(() => {
                        this.fetch.flushRequestCache('auth/organizations');
                        this.notifications.success('You have joined a new organization!');
                        setTimeout(() => {
                            window.location.reload();
                        }, 900);
                    });
                }

                return this.fetch
                    .post('auth/create-organization', {
                        name,
                        description,
                        phone,
                        currency,
                        country,
                        timezone,
                    })
                    .then(() => {
                        this.fetch.flushRequestCache('auth/organizations');
                        this.notifications.success('You have created a new organization!');
                        later(
                            this,
                            () => {
                                window.location.reload();
                            },
                            900
                        );
                    });
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
            title: `Are you sure you want to switch organization to ${organization.name}?`,
            body: `By confirming your account will remain logged in, but your primary organization will be switched.`,
            acceptButtonText: `Yes, I want to switch organization`,
            acceptButtonScheme: 'primary',
            confirm: (modal) => {
                modal.startLoading();

                return this.fetch
                    .post('auth/switch-organization', { next: organization.uuid })
                    .then(() => {
                        this.fetch.flushRequestCache('auth/organizations');
                        this.notifications.success('You have switched organizations');
                        setTimeout(() => {
                            window.location.reload();
                        }, 900);
                    })
                    .catch((error) => {
                        this.notifications.serverError(error);
                    });
            },
        });
    }

    @action viewChangelog() {
        this.modalsManager.show('modals/changelog', {
            title: 'Changelog',
            acceptButtonText: 'OK',
            hideDeclineButton: true,
        });
    }
}

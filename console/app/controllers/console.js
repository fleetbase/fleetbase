import Controller from '@ember/controller';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { later } from '@ember/runloop';
import { action } from '@ember/object';
import { isArray } from '@ember/array';
import { dasherize } from '@ember/string';
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
    @tracked organizations = [];
    @tracked menuItems = [];
    @tracked userMenuItems = [];
    @tracked organizationMenuItems = [];

    get currentRouteClass() {
        return dasherize(this.router.currentRouteName.replace(/\./g, ' '));
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
        const currency = this.currentUser.company?.currency ?? this.currentUser.currency ?? 'USD';
        const country = this.currentUser.company?.country ?? this.currentUser.country;
        const timezone = this.currentUser.company?.timezone ?? this.currentUser.whois('timezone');

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
            timezone,
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

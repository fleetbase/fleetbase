import Controller from '@ember/controller';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { later } from '@ember/runloop';
import { htmlSafe } from '@ember/template';

export default class ConsoleAccountOrganizationsController extends Controller {
    @service currentUser;
    @service modalsManager;
    @service crud;
    @service notifications;
    @service intl;
    @service fetch;
    @service router;

    @action async leaveOrganization(organization) {
        const isOwner = this.currentUser.id === organization.owner_uuid;
        const hasOtherMembers = organization.users_count > 1;
        const willBeDeleted = isOwner && organization.users_count === 1;

        if (this.model.length === 1) {
            return this.notifications.warning('Unable to leave your only organization.');
        }

        if (hasOtherMembers) {
            organization.loadUsers({ exclude: [this.currentUser.id] });
        }

        this.modalsManager.show('modals/leave-organization', {
            title: isOwner ? (willBeDeleted ? 'Delete Organization' : 'Transfer Ownership and Leave') : 'Leave Organization',
            acceptButtonText: isOwner ? (willBeDeleted ? 'Delete Organization' : 'Transfer Ownership and Leave') : 'Leave Organization',
            acceptButtonScheme: 'danger',
            acceptButtonIcon: isOwner ? (willBeDeleted ? 'trash' : 'person-walking-arrow-right') : 'person-walking-arrow-right',
            acceptButtonDisabled: isOwner && hasOtherMembers,
            isOwner,
            hasOtherMembers,
            willBeDeleted,
            organization,
            newOwnerId: null,
            selectNewOwner: (newOwnerId) => {
                this.modalsManager.setOption('newOwnerId', newOwnerId);
                this.modalsManager.setOption('acceptButtonDisabled', false);
            },
            confirm: async (modal) => {
                modal.startLoading();

                if (isOwner) {
                    if (hasOtherMembers) {
                        const newOwnerId = this.modalsManager.getOption('newOwnerId');
                        try {
                            await organization.transferOwnership(newOwnerId, { leave: true });
                        } catch (error) {
                            this.notifications.serverError(error);
                        }

                        return this.router.refresh();
                    }

                    if (willBeDeleted) {
                        try {
                            await organization.destroyRecord();
                        } catch (error) {
                            this.notifications.serverError(error);
                        }

                        return this.router.refresh();
                    }
                }

                try {
                    await organization.leave();
                } catch (error) {
                    this.notifications.serverError(error);
                }

                return this.router.refresh();
            },
        });
    }

    @action switchOrganization(organization) {
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

    @action deleteOrganization(organization) {
        const isOwner = this.currentUser.id === organization.owner_uuid;

        if (this.model.length === 1) {
            return this.notifications.warning('Unable to delete your only organization.');
        }

        if (!isOwner) {
            return this.notifications.warning('You do not have rights to delete this organization.');
        }

        this.crud.delete(organization, {
            title: `Are you sure you want to delete the organization ${organization.name}?`,
            body: htmlSafe(
                `This action will permanently remove all data, including orders, members, and settings associated with the organization. <br /><br /><strong>This action cannot be undone.</strong>`
            ),
            acceptButtonText: 'Delete Organization',
            acceptButtonScheme: 'danger',
            acceptButtonIcon: 'trash',
            confirm: async (modal) => {
                modal.startLoading();

                try {
                    await organization.destroyRecord();
                    return this.router.refresh();
                } catch (error) {
                    this.notifications.serverError(error);
                }
            },
        });
    }

    @action editOrganization(organization) {
        this.modalsManager.show('modals/edit-organization', {
            title: 'Edit Organization',
            acceptButtonText: 'Save Changes',
            acceptButtonIcon: 'save',
            isOwner: this.currentUser.id === organization.owner_uuid,
            organization,
            confirm: async (modal) => {
                modal.startLoading();

                try {
                    await organization.save();
                    return this.router.refresh();
                } catch (error) {
                    this.notifications.serverError(error);
                }
            },
        });
    }

    @action createOrganization() {
        const currency = this.currentUser.currency;
        const country = this.currentUser.country;

        this.modalsManager.show('modals/edit-organization', {
            title: 'Create Organization',
            acceptButtonText: this.intl.t('common.confirm'),
            acceptButtonIcon: 'check',
            acceptButtonIconPrefix: 'fas',
            organization: {
                name: null,
                decription: null,
                phone: null,
                currency,
                country,
                timezone: null,
            },
            confirm: async (modal) => {
                modal.startLoading();

                const organization = modal.getOption('organization');
                const { name, description, phone, currency, country, timezone } = organization;

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
                    return this.router.refresh();
                } catch (error) {
                    modal.stopLoading();
                    return this.notifications.serverError(error);
                }
            },
        });
    }
}

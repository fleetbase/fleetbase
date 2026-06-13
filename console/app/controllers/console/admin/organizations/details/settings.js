import Controller from '@ember/controller';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';

export default class ConsoleAdminOrganizationsDetailsSettingsController extends Controller {
    @service router;
    @service fetch;
    @service notifications;
    @service modalsManager;

    @action editOrganization() {
        this.modalsManager.show('modals/edit-organization', {
            title: 'Edit Organization',
            acceptButtonText: 'Save Changes',
            acceptButtonIcon: 'save',
            organization: this.model,
            confirm: async (modal) => {
                modal.startLoading();

                try {
                    await this.model.save();
                    this.notifications.success('Organization updated.');
                    return this.router.refresh();
                } catch (error) {
                    this.notifications.serverError(error);
                }
            },
        });
    }

    @action setStatus(status) {
        this.modalsManager.confirm({
            title: 'Update Organization Status',
            body: `Set this organization status to ${status}?`,
            acceptButtonText: 'Update Status',
            confirm: async (modal) => {
                modal.startLoading();

                try {
                    await this.fetch.patch(`companies/${this.model.uuid}/status`, { status });
                    this.notifications.success('Organization status updated.');
                    return this.router.refresh();
                } catch (error) {
                    this.notifications.serverError(error);
                }
            },
        });
    }

    @action setOnboarding(completed) {
        this.modalsManager.confirm({
            title: completed ? 'Mark Onboarding Complete' : 'Mark Onboarding Incomplete',
            body: completed ? 'Mark this organization onboarding as complete?' : 'Mark this organization onboarding as incomplete?',
            acceptButtonText: completed ? 'Mark Complete' : 'Mark Incomplete',
            confirm: async (modal) => {
                modal.startLoading();

                try {
                    await this.fetch.patch(`companies/${this.model.uuid}/onboarding`, { completed });
                    this.notifications.success('Organization onboarding updated.');
                    return this.router.refresh();
                } catch (error) {
                    this.notifications.serverError(error);
                }
            },
        });
    }
}

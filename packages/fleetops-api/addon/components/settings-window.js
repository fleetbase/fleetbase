import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';

export default class SettingsWindowComponent extends Component {
    @service currentUser;
    @service store;
    @service notifications;
    @service intl;

    @tracked isSaving = false;
    @tracked isLoading = false;
    @tracked company;

    @action onLoad() {
        if (typeof this.args.onLoad === 'function') {
            this.args.onLoad(...arguments);
        }

        this.fetchCurrentCompany();
    }

    @action fetchCurrentCompany() {
        this.isLoading = true;

        this.store
            .findRecord('company', this.currentUser.companyId)
            .then((company) => {
                company.options = this.createDefaultSettings(company.options);
                this.company = company;
            })
            .finally(() => {
                this.isLoading = false;
            });
    }

    @action createDefaultSettings(settings) {
        if (!settings) {
            settings = {
                fleetops: {
                    adhoc_distance: 6000,
                },
                storefront: {},
            };
        }

        return settings;
    }

    @action saveSettings() {
        this.isSaving = true;

        return this.company
            .save()
            .then(() => {
                this.notifications.success(this.intl.t('fleet-ops.component.settings-window.success-message'));
            })
            .finally(() => {
                this.isSaving = false;
            });
    }
}

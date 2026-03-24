import Controller from '@ember/controller';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';

const defaultSettings = () => ({
    company_name: '',
    support_phone: '',
    support_email: '',
    default_dispatch_mode: 'manual',
    auto_assign_new_orders: false,
    show_advanced_permissions: false,
    service_notes: '',
});

export default class ConsoleOpsSettingsController extends Controller {
    @service fetch;
    @service notifications;

    @tracked settings = defaultSettings();
    @tracked isSaving = false;

    hydrate(payload) {
        this.settings = { ...defaultSettings(), ...(payload.settings ?? {}) };
    }

    @action updateField(field, event) {
        this.settings = { ...this.settings, [field]: event.target.value };
    }

    @action toggleField(field, event) {
        this.settings = { ...this.settings, [field]: event.target.checked };
    }

    @action async save(event) {
        event.preventDefault();
        this.isSaving = true;

        try {
            const payload = await this.fetch.patch('ops/settings', this.settings);
            this.hydrate(payload);
            this.notifications.success('Ops settings saved.');
        } catch (error) {
            this.notifications.error(error.message ?? 'Unable to save settings.');
        } finally {
            this.isSaving = false;
        }
    }
}

import Controller from '@ember/controller';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';

export default class ConsoleAdminOrganizationsDetailsIndexController extends Controller {
    @service router;

    get organization() {
        return this.model?.organization;
    }

    get owner() {
        return this.resolveBelongsTo(this.organization?.owner);
    }

    get ownerName() {
        return this.owner?.name;
    }

    get ownerEmail() {
        return this.owner?.email;
    }

    get ownerPhone() {
        return this.owner?.phone;
    }

    get statusLabel() {
        return this.organization?.statusLabel || this.organization?.status || 'active';
    }

    get onboardingState() {
        return this.organization?.onboarding_completed ? 'Complete' : 'Incomplete';
    }

    get usageRows() {
        const usage = this.model?.usage;

        return [
            { key: 'users_count', label: 'Organization users' },
            { key: 'drivers_count', label: 'Drivers' },
            { key: 'customers_count', label: 'Customers' },
            { key: 'orders_count', label: 'Orders' },
            { key: 'api_requests_count', label: 'API calls' },
            { key: 'webhook_callbacks_count', label: 'Webhook callbacks' },
        ].map((row) => ({ ...row, value: usage?.[row.key] ?? null }));
    }

    @action refresh() {
        return this.router.refresh();
    }

    resolveBelongsTo(record) {
        if (!record) {
            return null;
        }

        if (record.content) {
            return record.content;
        }

        if (record.isPending || record.isFulfilled === false || typeof record.then === 'function') {
            return null;
        }

        return record;
    }
}

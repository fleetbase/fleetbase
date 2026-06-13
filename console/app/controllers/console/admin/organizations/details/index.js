import Controller from '@ember/controller';

export default class ConsoleAdminOrganizationsDetailsIndexController extends Controller {
    get organization() {
        return this.model;
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

    get ownerState() {
        return this.owner ? 'Assigned' : 'Missing';
    }

    get statusLabel() {
        return this.organization?.statusLabel || this.organization?.status || 'active';
    }

    get onboardingState() {
        return this.organization?.onboarding_completed ? 'Complete' : 'Incomplete';
    }

    get metrics() {
        return [
            {
                label: 'Users',
                value: this.organization?.users_count ?? 0,
                caption: 'Organization members',
                icon: 'users',
                accentClass: 'admin-organization-kpi-accent-blue',
            },
            {
                label: 'Owner',
                value: this.ownerState,
                caption: this.ownerEmail ?? 'Needs assignment',
                icon: this.owner ? 'user-check' : 'user-slash',
                accentClass: this.owner ? 'admin-organization-kpi-accent-green' : 'admin-organization-kpi-accent-amber',
            },
            {
                label: 'Onboarding',
                value: this.onboardingState,
                caption: this.organization?.onboarding_completed ? 'Ready for operations' : 'Needs review',
                icon: this.organization?.onboarding_completed ? 'circle-check' : 'triangle-exclamation',
                accentClass: this.organization?.onboarding_completed ? 'admin-organization-kpi-accent-green' : 'admin-organization-kpi-accent-amber',
            },
            {
                label: 'Status',
                value: this.statusLabel,
                caption: 'Platform access',
                icon: this.statusLabel === 'active' ? 'shield-check' : 'circle-exclamation',
                accentClass: this.statusLabel === 'active' ? 'admin-organization-kpi-accent-green' : 'admin-organization-kpi-accent-rose',
            },
        ];
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

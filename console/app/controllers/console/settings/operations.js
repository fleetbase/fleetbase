import Controller from '@ember/controller';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';

/**
 * Controller for the per-company Operations Settings screen at
 * `/console/settings/operations`.
 *
 * Backed by the Task 2 CompanySettingsController endpoints:
 *   - GET v1/company-settings/current  (resolved tree under `settings`)
 *   - PUT v1/company-settings/current  (accepts flat dot-notation keys)
 *
 * Save payload contract (LOCKED by Task 2):
 *
 *   { settings: { 'billing.default_payment_terms_days': 45, ... } }
 *
 * The 6 tab components each produce a flat-dot-notation object scoped to
 * their category; this controller wraps it under `settings` and PUTs it.
 * Company context is sourced by the backend from the
 * `X-Company-Context` header injected by the fetch service (Task 14) — we
 * deliberately do NOT read `currentUser.activeCompanyContext` here.
 */
const TAB_KEYS = ['billing', 'tendering', 'documents', 'pay-files', 'fuel', 'audit'];

export default class ConsoleSettingsOperationsController extends Controller {
    @service fetch;
    @service notifications;
    @service router;

    /**
     * Currently visible tab. Drives the template's `eq` branch selection.
     */
    @tracked activeTab = 'billing';

    /**
     * Save-in-flight flag shared with every tab component so the Save
     * button can show a spinner / disabled state.
     */
    @tracked isSaving = false;

    get accessDenied() {
        return this.model?.accessDenied === true;
    }

    get settings() {
        return this.model?.settings ?? {};
    }

    get tabs() {
        return TAB_KEYS;
    }

    get billing() {
        return this.settings.billing ?? {};
    }
    get tendering() {
        return this.settings.tendering ?? {};
    }
    get documents() {
        return this.settings.documents ?? {};
    }
    /**
     * Backend resolver exposes this category as `pay_files` (underscore);
     * the URL slug and tab label use the hyphenated form `pay-files`. The
     * save payload must still use the underscored prefix `pay_files.*`.
     */
    get payFiles() {
        return this.settings.pay_files ?? {};
    }
    get fuel() {
        return this.settings.fuel ?? {};
    }
    get audit() {
        return this.settings.audit ?? {};
    }

    @action setActiveTab(tab) {
        this.activeTab = tab;
    }

    /**
     * Save a single category's edits.
     *
     * `payload` is a flat object keyed by `<category>.<key>` (e.g.
     * `{ 'billing.default_payment_terms_days': 45 }`). We wrap it under
     * `settings` before PUTing to match Task 2's controller contract.
     *
     * Errors are mapped through the notifications service:
     *   - 422: surface the first validation error message.
     *   - 401/403: generic permission-denied message.
     *   - other: generic save-failed message.
     *
     * On success the route is refreshed so the next render reads the
     * resolved tree from the server (catches defaulted values the backend
     * filled in from org-level config).
     */
    @action
    async saveCategory(payload) {
        if (!payload || typeof payload !== 'object') {
            return;
        }

        this.isSaving = true;
        try {
            await this.fetch.put('v1/company-settings/current', { settings: payload });
            this.notifications?.success?.('Settings saved');
            this.router.refresh();
        } catch (error) {
            const status = error?.status ?? error?.response?.status;
            const body = error?.response?.json ?? error?.json ?? {};
            if (status === 422) {
                const errors = body?.errors ?? {};
                const first = Object.values(errors)[0];
                const message = Array.isArray(first) ? first[0] : first || 'Invalid values';
                this.notifications?.error?.(message);
            } else if (status === 401 || status === 403) {
                this.notifications?.error?.('You do not have permission to change these settings');
            } else {
                this.notifications?.error?.('Could not save settings');
            }
        } finally {
            this.isSaving = false;
        }
    }
}

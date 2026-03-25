import Controller from '@ember/controller';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';

const defaultProfileForm = () => ({
    name: '',
    email: '',
    phone: '',
    drivers_license_number: '',
});

const defaultApplicationForm = () => ({
    name: '',
    email: '',
    phone: '',
    drivers_license_number: '',
    notes: '',
});

const defaultVehicleForm = () => ({
    name: '',
    make: '',
    model: '',
    year: '',
    plate_number: '',
    color: '',
    type: '',
    notes: '',
});

const defaultPayoutForm = () => ({
    method: 'bank_transfer',
    account_name: '',
    payout_email: '',
    account_number: '',
    country_code: 'UG',
    bank_id: '',
    bank_name: '',
    bank_code: '',
    provider_type: '',
    branch_code: '',
    branch_name: '',
    swift_code: '',
    routing_number: '',
});

const payoutCountryOptions = [
    { code: 'UG', label: 'Uganda' },
    { code: 'NG', label: 'Nigeria' },
    { code: 'GH', label: 'Ghana' },
    { code: 'KE', label: 'Kenya' },
    { code: 'TZ', label: 'Tanzania' },
    { code: 'RW', label: 'Rwanda' },
    { code: 'ZA', label: 'South Africa' },
    { code: 'US', label: 'United States' },
    { code: 'GB', label: 'United Kingdom' },
    { code: 'DE', label: 'Germany' },
    { code: 'FR', label: 'France' },
    { code: 'ES', label: 'Spain' },
];

const payoutMethodForProviderType = (providerType) => {
    const normalized = (providerType ?? '').toLowerCase();

    return normalized.includes('mobile') || normalized.includes('wallet') ? 'mobile_money' : 'bank_transfer';
};

const payoutProviderTypeLabel = (providerType) => {
    const normalized = (providerType ?? '').toLowerCase();

    if (!normalized) {
        return '';
    }

    if (normalized.includes('mobile')) {
        return 'Mobile money';
    }

    if (normalized.includes('wallet')) {
        return 'Wallet';
    }

    if (normalized === 'bank') {
        return 'Bank';
    }

    return normalized
        .split(/[_-]+/)
        .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
        .join(' ');
};

export default class InviteForDriverController extends Controller {
    @service fetch;
    @service notifications;

    @tracked portal = null;
    @tracked identity = '';
    @tracked code = '';
    @tracked previewCode = null;
    @tracked token = null;
    @tracked driverState = null;
    @tracked profileForm = defaultProfileForm();
    @tracked applicationForm = defaultApplicationForm();
    @tracked vehicleForm = defaultVehicleForm();
    @tracked payoutForm = defaultPayoutForm();
    @tracked payoutInstitutions = [];
    @tracked payoutBranches = [];
    @tracked payoutRequirements = {};
    @tracked selectedOrderUuid = null;
    @tracked isEditingVehicleRequest = false;
    @tracked isRequestingCode = false;
    @tracked isVerifyingCode = false;
    @tracked isRefreshingDriver = false;
    @tracked isSavingProfile = false;
    @tracked isTogglingOnline = false;
    @tracked isRestoringSession = false;
    @tracked isSubmittingApplication = false;
    @tracked isSavingVehicle = false;
    @tracked isSavingPayoutProfile = false;
    @tracked isLoadingPayoutOptions = false;
    @tracked isLoadingPayoutBranches = false;
    @tracked lastSyncedAt = null;
    @tracked activeWorkspaceSection = 'work';

    autoRefreshTimer = null;
    handleVisibilityWake = null;
    handleWindowFocus = null;

    hydrate(model) {
        this.portal = model?.portal ?? null;
        this.identity = '';
        this.previewCode = null;
        this.code = '';
        this.token = null;
        this.driverState = null;
        this.profileForm = defaultProfileForm();
        this.applicationForm = defaultApplicationForm();
        this.vehicleForm = defaultVehicleForm();
        this.payoutForm = defaultPayoutForm();
        this.payoutInstitutions = [];
        this.payoutBranches = [];
        this.payoutRequirements = {};
        this.selectedOrderUuid = null;
        this.isEditingVehicleRequest = false;
        this.lastSyncedAt = null;
        this.activeWorkspaceSection = 'work';
    }

    get portalStorageKey() {
        return this.portal?.public_id ? `driver-portal:${this.portal.public_id}:token` : null;
    }

    get portalStateStorageKey() {
        return this.portal?.public_id ? `driver-portal:${this.portal.public_id}:state` : null;
    }

    get authHeaders() {
        return this.token ? { Authorization: `Bearer ${this.token}` } : {};
    }

    get isAuthenticated() {
        return Boolean(this.token && this.driverState);
    }

    get currentOrder() {
        return this.driverState?.current_order ?? null;
    }

    get isApproved() {
        return Boolean(this.driverState?.is_approved);
    }

    get isPendingApproval() {
        return this.isAuthenticated && !this.isApproved;
    }

    get activeOrders() {
        return this.driverState?.active_orders ?? [];
    }

    get selectedUpcomingOrder() {
        const candidate = this.activeOrders.find((order) => order.uuid === this.selectedOrderUuid);
        return candidate ?? this.currentOrder ?? this.activeOrders[0] ?? null;
    }

    get deliveredOrders() {
        return this.driverState?.delivered_orders ?? [];
    }

    get earnings() {
        return this.driverState?.earnings ?? null;
    }

    get payoutProfile() {
        return this.driverState?.payout_profile ?? null;
    }

    get payoutCountryOptions() {
        return payoutCountryOptions;
    }

    get selectedPayoutInstitution() {
        return this.payoutInstitutions.find((institution) => String(institution.id) === String(this.payoutForm.bank_id)) ?? null;
    }

    get payoutInstitutionOptions() {
        return [...this.payoutInstitutions]
            .sort((left, right) => {
                const leftMethod = payoutMethodForProviderType(left.provider_type);
                const rightMethod = payoutMethodForProviderType(right.provider_type);

                if (leftMethod !== rightMethod) {
                    return leftMethod === 'mobile_money' ? -1 : 1;
                }

                return left.name.localeCompare(right.name);
            })
            .map((institution) => ({
                ...institution,
                displayLabel: payoutProviderTypeLabel(institution.provider_type) ? `${institution.name} • ${payoutProviderTypeLabel(institution.provider_type)}` : institution.name,
            }));
    }

    get selectedPayoutMethodLabel() {
        return this.payoutForm.method === 'mobile_money' ? 'Mobile money wallet' : 'Permanent bank account';
    }

    get payoutRequiresBranch() {
        return Boolean(this.payoutRequirements?.requires_branch) && this.payoutForm.method !== 'mobile_money';
    }

    get payoutRequiresSwiftCode() {
        return Boolean(this.payoutRequirements?.requires_swift_code) && this.payoutForm.method !== 'mobile_money';
    }

    get payoutRequiresRoutingNumber() {
        return Boolean(this.payoutRequirements?.requires_routing_number) && this.payoutForm.method !== 'mobile_money';
    }

    get showPayoutOptionsEmptyState() {
        return Boolean(this.payoutForm.country_code) && !this.isLoadingPayoutOptions && this.payoutInstitutions.length === 0;
    }

    get payoutBatches() {
        return this.driverState?.payout_batches ?? [];
    }

    get checklist() {
        return this.driverState?.checklist ?? [];
    }

    get checklistCompletedCount() {
        return this.checklist.filter((item) => item.complete).length;
    }

    get currentVehicleLabel() {
        return this.activeVehicle?.label ?? this.activeVehicle?.name ?? this.pendingVehicle?.label ?? this.pendingVehicle?.name ?? 'No vehicle approved yet';
    }

    get activeVehicle() {
        return this.driverState?.vehicle ?? null;
    }

    get pendingVehicle() {
        return this.driverState?.pending_vehicle ?? null;
    }

    get hasActiveVehicle() {
        return Boolean(this.activeVehicle);
    }

    get hasPendingVehicle() {
        return Boolean(this.pendingVehicle);
    }

    get showVehicleRequestForm() {
        return !this.hasActiveVehicle || this.isEditingVehicleRequest;
    }

    get driverStatusTone() {
        return this.driverState?.online ? 'is-online' : 'is-offline';
    }

    get hasPortalDriver() {
        return Boolean(this.portal?.driver);
    }

    get driverAvailabilityLabel() {
        if (!this.isApproved) {
            return 'Waiting approval';
        }

        return this.driverState?.online ? 'Ready for work' : 'Offline';
    }

    get workQueueLabel() {
        return this.activeOrders.length === 1 ? '1 job waiting' : `${this.activeOrders.length} jobs waiting`;
    }

    get currentFocusLabel() {
        return this.currentOrder?.stage?.label ?? this.selectedUpcomingOrder?.stage?.label ?? 'No live job';
    }

    get syncStatusLabel() {
        if (this.isRefreshingDriver) {
            return 'Syncing now...';
        }

        if (!this.lastSyncedAt) {
            return 'Waiting for first sync';
        }

        const formatted = this.lastSyncedAt.toLocaleTimeString([], {
            hour: 'numeric',
            minute: '2-digit',
        });

        return `Updated ${formatted}`;
    }

    get isWorkSectionActive() {
        return this.activeWorkspaceSection === 'work';
    }

    get isMoneySectionActive() {
        return this.activeWorkspaceSection === 'money';
    }

    get isAccountSectionActive() {
        return this.activeWorkspaceSection === 'account';
    }

    startAutoRefresh() {
        this.stopAutoRefresh();

        if (typeof window === 'undefined') {
            return;
        }

        if (!this.handleVisibilityWake) {
            this.handleVisibilityWake = async () => {
                if (!this.isAuthenticated || typeof document === 'undefined' || document.hidden || this.isRefreshingDriver) {
                    return;
                }

                try {
                    await this.loadDriverState();
                } catch {
                    // silent background refresh
                }
            };
        }

        if (!this.handleWindowFocus) {
            this.handleWindowFocus = async () => {
                if (!this.isAuthenticated || this.isRefreshingDriver) {
                    return;
                }

                try {
                    await this.loadDriverState();
                } catch {
                    // silent background refresh
                }
            };
        }

        if (typeof document !== 'undefined') {
            document.addEventListener('visibilitychange', this.handleVisibilityWake);
        }

        window.addEventListener('focus', this.handleWindowFocus);

        this.autoRefreshTimer = window.setInterval(async () => {
            if (!this.isAuthenticated || this.isRefreshingDriver || typeof document === 'undefined' || document.hidden) {
                return;
            }

            try {
                await this.loadDriverState();
            } catch {
                // silent background refresh
            }
        }, 6000);
    }

    stopAutoRefresh() {
        if (typeof window !== 'undefined' && this.autoRefreshTimer) {
            window.clearInterval(this.autoRefreshTimer);
        }

        if (typeof document !== 'undefined' && this.handleVisibilityWake) {
            document.removeEventListener('visibilitychange', this.handleVisibilityWake);
        }

        if (typeof window !== 'undefined' && this.handleWindowFocus) {
            window.removeEventListener('focus', this.handleWindowFocus);
        }

        this.autoRefreshTimer = null;
    }

    async restoreDriverSession() {
        const token = this.readStoredToken();
        if (!token) {
            return;
        }

        this.token = token;
        const cachedDriverState = this.readStoredDriverState();
        if (cachedDriverState) {
            this.driverState = cachedDriverState;
            this.syncProfileForm(cachedDriverState);
        }
        this.isRestoringSession = true;

        try {
            await this.loadDriverState();
        } catch (error) {
            if (!cachedDriverState) {
                this.clearStoredToken();
                this.clearStoredDriverState();
                this.token = null;
                this.driverState = null;
            }
        } finally {
            this.isRestoringSession = false;
        }
    }

    async loadDriverState() {
        if (!this.portal?.public_id || !this.token) {
            return null;
        }

        this.isRefreshingDriver = true;

        try {
            const payload = await this.fetch.post(
                'driver-portal/me',
                { public_id: this.portal.public_id, refresh_at: Date.now() },
                {
                    namespace: 'api/v1',
                    headers: this.authHeaders,
                }
            );

            this.driverState = payload.driver;
            this.syncProfileForm(payload.driver);
            this.storeDriverState(payload.driver);
            this.lastSyncedAt = new Date();
            await this.syncPayoutReferenceData(payload.driver, { silent: true });
            this.startAutoRefresh();

            return payload.driver;
        } finally {
            this.isRefreshingDriver = false;
        }
    }

    syncProfileForm(driver) {
        this.profileForm = {
            name: driver?.name ?? '',
            email: driver?.email ?? '',
            phone: driver?.phone ?? '',
            drivers_license_number: driver?.drivers_license_number ?? '',
        };

        const sourceVehicle = driver?.pending_vehicle ?? (!driver?.vehicle ? null : this.isEditingVehicleRequest ? null : driver.vehicle);
        this.vehicleForm = {
            name: sourceVehicle?.name ?? '',
            make: sourceVehicle?.make ?? '',
            model: sourceVehicle?.model ?? '',
            year: sourceVehicle?.year ?? '',
            plate_number: sourceVehicle?.plate_number ?? '',
            color: sourceVehicle?.color ?? '',
            type: sourceVehicle?.type ?? '',
            notes: sourceVehicle?.notes ?? '',
        };

        if (driver?.pending_vehicle) {
            this.isEditingVehicleRequest = false;
        } else if (!driver?.vehicle) {
            this.isEditingVehicleRequest = true;
        } else {
            this.isEditingVehicleRequest = false;
        }

        this.payoutForm = {
            method: driver?.payout_profile?.method ?? payoutMethodForProviderType(driver?.payout_profile?.provider_type),
            account_name: driver?.payout_profile?.account_name ?? '',
            payout_email: driver?.payout_profile?.payout_email ?? driver?.email ?? '',
            account_number: driver?.payout_profile?.account_number ?? driver?.payout_profile?.bank_account_number ?? driver?.payout_profile?.mobile_money_number ?? '',
            country_code: driver?.payout_profile?.country_code ?? 'UG',
            bank_id: driver?.payout_profile?.bank_id ? String(driver?.payout_profile?.bank_id) : '',
            bank_name: driver?.payout_profile?.bank_name ?? '',
            bank_code: driver?.payout_profile?.bank_code ?? '',
            provider_type: driver?.payout_profile?.provider_type ?? (driver?.payout_profile?.mobile_money_provider ? 'mobile_money' : ''),
            branch_code: driver?.payout_profile?.branch_code ?? '',
            branch_name: driver?.payout_profile?.branch_name ?? '',
            swift_code: driver?.payout_profile?.swift_code ?? '',
            routing_number: driver?.payout_profile?.routing_number ?? '',
        };

        if (this.selectedOrderUuid && !(driver?.active_orders ?? []).some((order) => order.uuid === this.selectedOrderUuid)) {
            this.selectedOrderUuid = driver?.current_order?.uuid ?? driver?.active_orders?.[0]?.uuid ?? null;
        } else if (!this.selectedOrderUuid) {
            this.selectedOrderUuid = driver?.current_order?.uuid ?? driver?.active_orders?.[0]?.uuid ?? null;
        }
    }

    async syncPayoutReferenceData(driver, { silent = true } = {}) {
        const countryCode = driver?.payout_profile?.country_code ?? this.payoutForm.country_code;

        if (!this.token || !countryCode) {
            return;
        }

        await this.loadPayoutOptions(countryCode, { silent });

        const bankId = driver?.payout_profile?.bank_id ?? this.payoutForm.bank_id;
        if (bankId && this.payoutRequiresBranch) {
            await this.loadPayoutBranches(countryCode, bankId, { silent });
        } else {
            this.payoutBranches = [];
        }
    }

    async loadPayoutOptions(countryCode, { silent = false } = {}) {
        if (!this.token || !countryCode) {
            this.payoutInstitutions = [];
            this.payoutRequirements = {};
            return;
        }

        this.isLoadingPayoutOptions = true;

        try {
            const payload = await this.fetch.post(
                'driver-portal/payout-options',
                {
                    public_id: this.portal.public_id,
                    country: countryCode,
                },
                {
                    namespace: 'api/v1',
                    headers: this.authHeaders,
                }
            );

            this.payoutInstitutions = (payload.institutions ?? []).map((institution) => ({
                ...institution,
                id: String(institution.id),
            }));
            this.payoutRequirements = payload.requirements ?? {};

            if (this.payoutForm.bank_id) {
                const institution = this.payoutInstitutions.find((item) => String(item.id) === String(this.payoutForm.bank_id));

                if (!institution) {
                    this.payoutForm = {
                        ...this.payoutForm,
                        method: 'bank_transfer',
                        bank_id: '',
                        bank_name: '',
                        bank_code: '',
                        provider_type: '',
                        branch_code: '',
                        branch_name: '',
                    };
                    this.payoutBranches = [];
                } else {
                    this.payoutForm = {
                        ...this.payoutForm,
                        method: payoutMethodForProviderType(institution.provider_type),
                        bank_id: String(institution.id),
                        bank_name: institution.name,
                        bank_code: institution.code,
                        provider_type: institution.provider_type ?? '',
                    };
                }
            }
        } catch (error) {
            this.payoutInstitutions = [];
            this.payoutRequirements = {};
            this.payoutBranches = [];

            if (!silent) {
                this.notifications.error(error.message ?? 'Unable to load payout institutions for that country.');
            }
        } finally {
            this.isLoadingPayoutOptions = false;
        }
    }

    async loadPayoutBranches(countryCode, bankId, { silent = false } = {}) {
        if (!this.token || !countryCode || !bankId) {
            this.payoutBranches = [];
            return;
        }

        this.isLoadingPayoutBranches = true;

        try {
            const payload = await this.fetch.post(
                'driver-portal/payout-branches',
                {
                    public_id: this.portal.public_id,
                    country: countryCode,
                    bank_id: bankId,
                },
                {
                    namespace: 'api/v1',
                    headers: this.authHeaders,
                }
            );

            this.payoutBranches = payload.branches ?? [];

            if (this.payoutForm.branch_code) {
                const branch = this.payoutBranches.find((item) => String(item.code) === String(this.payoutForm.branch_code));

                if (!branch) {
                    this.payoutForm = {
                        ...this.payoutForm,
                        branch_code: '',
                        branch_name: '',
                    };
                } else {
                    this.payoutForm = {
                        ...this.payoutForm,
                        branch_code: branch.code,
                        branch_name: branch.name,
                    };
                }
            }
        } catch (error) {
            this.payoutBranches = [];

            if (!silent) {
                this.notifications.error(error.message ?? 'Unable to load bank branches for that institution.');
            }
        } finally {
            this.isLoadingPayoutBranches = false;
        }
    }

    async deliverCodeForIdentity(identity) {
        const payload = await this.fetch.post(
            'driver-portal/request-code',
            {
                public_id: this.portal.public_id,
                identity,
            },
            { namespace: 'api/v1' }
        );

        this.previewCode = payload.preview_code ?? null;

        return payload;
    }

    readStoredToken() {
        if (!this.portalStorageKey || typeof localStorage === 'undefined') {
            return null;
        }

        return localStorage.getItem(this.portalStorageKey);
    }

    storePortalToken(token) {
        if (!this.portalStorageKey || typeof localStorage === 'undefined') {
            return;
        }

        localStorage.setItem(this.portalStorageKey, token);
    }

    clearStoredToken() {
        if (!this.portalStorageKey || typeof localStorage === 'undefined') {
            return;
        }

        localStorage.removeItem(this.portalStorageKey);
    }

    readStoredDriverState() {
        if (!this.portalStateStorageKey || typeof localStorage === 'undefined') {
            return null;
        }

        try {
            const rawValue = localStorage.getItem(this.portalStateStorageKey);
            return rawValue ? JSON.parse(rawValue) : null;
        } catch {
            return null;
        }
    }

    storeDriverState(driverState) {
        if (!this.portalStateStorageKey || typeof localStorage === 'undefined') {
            return;
        }

        localStorage.setItem(this.portalStateStorageKey, JSON.stringify(driverState));
    }

    clearStoredDriverState() {
        if (!this.portalStateStorageKey || typeof localStorage === 'undefined') {
            return;
        }

        localStorage.removeItem(this.portalStateStorageKey);
    }

    @action updateIdentity(event) {
        this.identity = event.target.value;
    }

    @action updateCode(event) {
        this.code = event.target.value;
    }

    @action updateProfileField(field, event) {
        this.profileForm = { ...this.profileForm, [field]: event.target.value };
    }

    @action updateApplicationField(field, event) {
        this.applicationForm = { ...this.applicationForm, [field]: event.target.value };
    }

    @action updateVehicleField(field, event) {
        this.vehicleForm = { ...this.vehicleForm, [field]: event.target.value };
    }

    @action updatePayoutField(field, event) {
        this.payoutForm = { ...this.payoutForm, [field]: event.target.value };
    }

    @action async updatePayoutCountry(event) {
        const countryCode = String(event.target.value ?? '').toUpperCase();

        this.payoutForm = {
            ...this.payoutForm,
            country_code: countryCode,
            method: 'bank_transfer',
            bank_id: '',
            bank_name: '',
            bank_code: '',
            provider_type: '',
            branch_code: '',
            branch_name: '',
            swift_code: '',
            routing_number: '',
        };
        this.payoutBranches = [];

        await this.loadPayoutOptions(countryCode);
    }

    @action async updatePayoutInstitution(event) {
        const bankId = String(event.target.value ?? '');
        const institution = this.payoutInstitutions.find((item) => String(item.id) === bankId);

        this.payoutForm = {
            ...this.payoutForm,
            method: payoutMethodForProviderType(institution?.provider_type),
            bank_id: bankId,
            bank_name: institution?.name ?? '',
            bank_code: institution?.code ?? '',
            provider_type: institution?.provider_type ?? '',
            branch_code: '',
            branch_name: '',
        };

        if (this.payoutRequiresBranch && bankId) {
            await this.loadPayoutBranches(this.payoutForm.country_code, bankId);
        } else {
            this.payoutBranches = [];
        }
    }

    @action updatePayoutBranch(event) {
        const branchCode = String(event.target.value ?? '');
        const branch = this.payoutBranches.find((item) => String(item.code) === String(branchCode));

        this.payoutForm = {
            ...this.payoutForm,
            branch_code: branchCode,
            branch_name: branch?.name ?? '',
        };
    }

    @action async reloadPayoutOptions() {
        await this.loadPayoutOptions(this.payoutForm.country_code);
    }

    @action async ensurePayoutOptionsLoaded() {
        if (this.payoutInstitutions.length > 0 || this.isLoadingPayoutOptions || !this.payoutForm.country_code) {
            return;
        }

        await this.loadPayoutOptions(this.payoutForm.country_code);
    }

    @action usePreviewCode() {
        if (this.previewCode) {
            this.code = this.previewCode;
        }
    }

    @action async requestCode(event) {
        event.preventDefault();

        if (!this.portal?.public_id) {
            return;
        }

        this.isRequestingCode = true;

        try {
            const payload = await this.deliverCodeForIdentity(this.identity);

            this.previewCode = payload.preview_code ?? null;
            this.notifications.success(`Verification code sent for ${payload.driver?.name ?? 'driver'}.`);
        } catch (error) {
            this.notifications.error(error.message ?? 'Unable to request a verification code.');
        } finally {
            this.isRequestingCode = false;
        }
    }

    @action async submitApplication(event) {
        event.preventDefault();

        if (!this.portal?.public_id) {
            return;
        }

        this.isSubmittingApplication = true;

        try {
            await this.fetch.post(
                'driver-portal/apply',
                {
                    public_id: this.portal.public_id,
                    ...this.applicationForm,
                },
                { namespace: 'api/v1' }
            );

            this.identity = this.applicationForm.email || this.applicationForm.phone;
            this.notifications.success('Application received. Use the verification code to enter your rider workspace while dispatch reviews it.');

            if (this.identity) {
                const payload = await this.deliverCodeForIdentity(this.identity);
                this.previewCode = payload.preview_code ?? null;
            }

            this.applicationForm = defaultApplicationForm();
        } catch (error) {
            this.notifications.error(error.message ?? 'Unable to submit the rider application.');
        } finally {
            this.isSubmittingApplication = false;
        }
    }

    @action async verifyCode(event) {
        event.preventDefault();

        if (!this.portal?.public_id) {
            return;
        }

        this.isVerifyingCode = true;

        try {
            const payload = await this.fetch.post(
                'driver-portal/verify-code',
                {
                    public_id: this.portal.public_id,
                    identity: this.identity,
                    code: this.code,
                },
                { namespace: 'api/v1' }
            );

            this.token = payload.token;
            this.storePortalToken(payload.token);
            this.driverState = payload.driver;
            this.syncProfileForm(payload.driver);
            this.storeDriverState(payload.driver);
            this.lastSyncedAt = new Date();
            await this.syncPayoutReferenceData(payload.driver, { silent: true });
            this.startAutoRefresh();
            this.notifications.success(`Welcome back, ${payload.driver?.name ?? 'driver'}.`);
        } catch (error) {
            this.notifications.error(error.message ?? 'Unable to verify that code.');
        } finally {
            this.isVerifyingCode = false;
        }
    }

    @action async toggleOnline() {
        if (!this.token) {
            return;
        }

        this.isTogglingOnline = true;

        try {
            const payload = await this.fetch.post(
                'driver-portal/me/toggle-online',
                {
                    public_id: this.portal.public_id,
                    online: !this.driverState?.online,
                },
                {
                    namespace: 'api/v1',
                    headers: this.authHeaders,
                }
            );

            this.driverState = payload.driver;
            this.syncProfileForm(payload.driver);
            this.storeDriverState(payload.driver);
            this.lastSyncedAt = new Date();
            this.notifications.success(`You are now ${payload.driver?.online ? 'online' : 'offline'}.`);
        } catch (error) {
            this.notifications.error(error.message ?? 'Unable to update driver availability.');
        } finally {
            this.isTogglingOnline = false;
        }
    }

    @action async saveProfile(event) {
        event.preventDefault();

        if (!this.token) {
            return;
        }

        this.isSavingProfile = true;

        try {
            const payload = await this.fetch.patch(
                'driver-portal/me/profile',
                {
                    public_id: this.portal.public_id,
                    ...this.profileForm,
                },
                {
                    namespace: 'api/v1',
                    headers: this.authHeaders,
                }
            );

            this.driverState = payload.driver;
            this.syncProfileForm(payload.driver);
            this.storeDriverState(payload.driver);
            this.lastSyncedAt = new Date();
            await this.syncPayoutReferenceData(payload.driver, { silent: true });
            this.notifications.success('Profile updated.');
        } catch (error) {
            this.notifications.error(error.message ?? 'Unable to update your driver profile.');
        } finally {
            this.isSavingProfile = false;
        }
    }

    @action async saveVehicle(event) {
        event.preventDefault();

        if (!this.token) {
            return;
        }

        this.isSavingVehicle = true;

        try {
            const payload = await this.fetch.patch(
                'driver-portal/me/vehicle',
                {
                    public_id: this.portal.public_id,
                    name: this.vehicleForm.name || null,
                    make: this.vehicleForm.make || null,
                    model: this.vehicleForm.model || null,
                    year: this.vehicleForm.year ? Number(this.vehicleForm.year) : null,
                    plate_number: this.vehicleForm.plate_number || null,
                    color: this.vehicleForm.color || null,
                    type: this.vehicleForm.type || null,
                    notes: this.vehicleForm.notes || null,
                    replace_pending: Boolean(this.pendingVehicle && this.isEditingVehicleRequest),
                },
                {
                    namespace: 'api/v1',
                    headers: this.authHeaders,
                }
            );

            this.driverState = payload.driver;
            this.isEditingVehicleRequest = false;
            this.syncProfileForm(payload.driver);
            this.storeDriverState(payload.driver);
            this.lastSyncedAt = new Date();
            await this.syncPayoutReferenceData(payload.driver, { silent: true });
            this.notifications.success(payload.driver?.pending_vehicle ? 'Vehicle request submitted for admin review.' : 'Vehicle details saved.');
        } catch (error) {
            this.notifications.error(error.message ?? 'Unable to save vehicle details.');
        } finally {
            this.isSavingVehicle = false;
        }
    }

    @action async savePayoutProfile(event) {
        event.preventDefault();

        if (!this.token) {
            return;
        }

        this.isSavingPayoutProfile = true;

        try {
            const payload = await this.fetch.patch(
                'driver-portal/me/payout-profile',
                {
                    public_id: this.portal.public_id,
                    ...this.payoutForm,
                },
                {
                    namespace: 'api/v1',
                    headers: this.authHeaders,
                }
            );

            this.driverState = payload.driver;
            this.syncProfileForm(payload.driver);
            this.storeDriverState(payload.driver);
            this.lastSyncedAt = new Date();
            await this.syncPayoutReferenceData(payload.driver, { silent: true });
            this.notifications.success('Payout details saved. Medusa can now sync this payout profile.');
        } catch (error) {
            this.notifications.error(error.message ?? 'Unable to save payout details.');
        } finally {
            this.isSavingPayoutProfile = false;
        }
    }

    @action async refreshDriverState() {
        try {
            await this.loadDriverState();
            this.notifications.success('Driver view refreshed.');
        } catch (error) {
            this.notifications.error(error.message ?? 'Unable to refresh driver state.');
        }
    }

    @action viewOrderDetails(order) {
        this.selectedOrderUuid = order?.uuid ?? null;
    }

    @action async setCurrentOrder(order) {
        if (!this.token || !order?.uuid) {
            return;
        }

        try {
            const payload = await this.fetch.post(
                `driver-portal/me/orders/${order.uuid}/select-current`,
                { public_id: this.portal.public_id },
                {
                    namespace: 'api/v1',
                    headers: this.authHeaders,
                }
            );

            this.driverState = payload.driver;
            this.selectedOrderUuid = order.uuid;
            this.syncProfileForm(payload.driver);
            this.storeDriverState(payload.driver);
            this.lastSyncedAt = new Date();
            this.notifications.success('Current delivery updated.');
        } catch (error) {
            this.notifications.error(error.message ?? 'Unable to set the current delivery.');
        }
    }

    @action async acceptOrder(order) {
        if (!this.token || !order?.uuid) {
            return;
        }

        try {
            const payload = await this.fetch.post(
                `driver-portal/me/orders/${order.uuid}/accept`,
                { public_id: this.portal.public_id },
                {
                    namespace: 'api/v1',
                    headers: this.authHeaders,
                }
            );

            this.driverState = payload.driver;
            this.selectedOrderUuid = order.uuid;
            this.syncProfileForm(payload.driver);
            this.storeDriverState(payload.driver);
            this.lastSyncedAt = new Date();
            this.notifications.success('Dispatch can now see that you accepted this pickup.');
        } catch (error) {
            this.notifications.error(error.message ?? 'Unable to accept this order.');
        }
    }

    @action async rejectOrder(order) {
        if (!this.token || !order?.uuid) {
            return;
        }

        try {
            const payload = await this.fetch.post(
                `driver-portal/me/orders/${order.uuid}/reject`,
                { public_id: this.portal.public_id },
                {
                    namespace: 'api/v1',
                    headers: this.authHeaders,
                }
            );

            this.driverState = payload.driver;
            this.syncProfileForm(payload.driver);
            this.storeDriverState(payload.driver);
            this.lastSyncedAt = new Date();
            this.notifications.success('Order released back to dispatch for reassignment.');
        } catch (error) {
            this.notifications.error(error.message ?? 'Unable to reject this order.');
        }
    }

    @action async arrivedAtPickup(order) {
        if (!this.token || !order?.uuid) {
            return;
        }

        try {
            const payload = await this.fetch.post(
                `driver-portal/me/orders/${order.uuid}/arrived-pickup`,
                { public_id: this.portal.public_id },
                {
                    namespace: 'api/v1',
                    headers: this.authHeaders,
                }
            );

            this.driverState = payload.driver;
            this.syncProfileForm(payload.driver);
            this.storeDriverState(payload.driver);
            this.lastSyncedAt = new Date();
            this.notifications.success('Pickup arrival recorded. Merchant can now see you are at the pickup point.');
        } catch (error) {
            this.notifications.error(error.message ?? 'Unable to confirm pickup arrival.');
        }
    }

    @action async updateOrderStage(order, status) {
        if (!this.token || !order?.uuid || !status) {
            return;
        }

        try {
            const payload = await this.fetch.post(
                `driver-portal/me/orders/${order.uuid}/status`,
                {
                    public_id: this.portal.public_id,
                    status,
                },
                {
                    namespace: 'api/v1',
                    headers: this.authHeaders,
                }
            );

            this.driverState = payload.driver;
            this.syncProfileForm(payload.driver);
            this.storeDriverState(payload.driver);
            this.lastSyncedAt = new Date();
            this.notifications.success(`Order moved to ${status}.`);
        } catch (error) {
            this.notifications.error(error.message ?? 'Unable to update this order stage.');
        }
    }

    @action logoutDriverPortal() {
        this.clearStoredToken();
        this.clearStoredDriverState();
        this.token = null;
        this.driverState = null;
        this.stopAutoRefresh();
        this.code = '';
        this.previewCode = null;
        this.profileForm = defaultProfileForm();
        this.vehicleForm = defaultVehicleForm();
        this.payoutForm = defaultPayoutForm();
        this.payoutInstitutions = [];
        this.payoutBranches = [];
        this.payoutRequirements = {};
        this.isEditingVehicleRequest = false;
        this.lastSyncedAt = null;
        this.activeWorkspaceSection = 'work';
        this.notifications.success('Driver session closed.');
    }

    @action startVehicleRequest() {
        this.isEditingVehicleRequest = true;
        this.vehicleForm = defaultVehicleForm();
    }

    @action setActiveWorkspaceSection(section) {
        this.activeWorkspaceSection = section;
    }
}

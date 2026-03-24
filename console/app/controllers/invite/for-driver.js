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
    @tracked isEditingVehicleRequest = false;
    @tracked isRequestingCode = false;
    @tracked isVerifyingCode = false;
    @tracked isRefreshingDriver = false;
    @tracked isSavingProfile = false;
    @tracked isTogglingOnline = false;
    @tracked isRestoringSession = false;
    @tracked isSubmittingApplication = false;
    @tracked isSavingVehicle = false;

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
        this.isEditingVehicleRequest = false;
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

    get deliveredOrders() {
        return this.driverState?.delivered_orders ?? [];
    }

    get earnings() {
        return this.driverState?.earnings ?? null;
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
            this.notifications.success(payload.driver?.pending_vehicle ? 'Vehicle request submitted for admin review.' : 'Vehicle details saved.');
        } catch (error) {
            this.notifications.error(error.message ?? 'Unable to save vehicle details.');
        } finally {
            this.isSavingVehicle = false;
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

    @action logoutDriverPortal() {
        this.clearStoredToken();
        this.clearStoredDriverState();
        this.token = null;
        this.driverState = null;
        this.code = '';
        this.previewCode = null;
        this.profileForm = defaultProfileForm();
        this.vehicleForm = defaultVehicleForm();
        this.isEditingVehicleRequest = false;
        this.notifications.success('Driver session closed.');
    }

    @action startVehicleRequest() {
        this.isEditingVehicleRequest = true;
        this.vehicleForm = defaultVehicleForm();
    }
}

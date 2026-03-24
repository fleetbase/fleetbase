import Controller from '@ember/controller';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';

const defaultDriverForm = () => ({
    name: '',
    email: '',
    phone: '',
    status: 'active',
    role_key: 'driver',
    vehicle_uuid: '',
});

export default class ConsoleOpsDriversController extends Controller {
    @service fetch;
    @service notifications;

    @tracked drivers = [];
    @tracked vehicles = [];
    @tracked rolePresets = [];
    @tracked portal = null;
    @tracked driverForm = defaultDriverForm();
    @tracked isSubmitting = false;

    get pendingDrivers() {
        return this.drivers.filter((driver) => driver.status === 'pending_approval');
    }

    hydrate(payload) {
        this.drivers = payload.drivers ?? [];
        this.vehicles = payload.vehicles ?? [];
        this.rolePresets = payload.role_presets ?? [];
        this.portal = payload.portal ?? null;
    }

    async reload() {
        const payload = await this.fetch.get('ops/drivers');
        this.hydrate(payload);
    }

    @action updateField(field, event) {
        this.driverForm = { ...this.driverForm, [field]: event.target.value };
    }

    @action async createDriver(event) {
        event.preventDefault();
        this.isSubmitting = true;

        try {
            await this.fetch.post('ops/drivers', {
                name: this.driverForm.name,
                email: this.driverForm.email,
                phone: this.driverForm.phone,
                status: this.driverForm.status,
                role_key: this.driverForm.role_key,
                vehicle_uuid: this.driverForm.vehicle_uuid || null,
            });

            this.notifications.success('Driver created.');
            this.driverForm = defaultDriverForm();
            await this.reload();
        } catch (error) {
            this.notifications.error(error.message ?? 'Unable to create driver.');
        } finally {
            this.isSubmitting = false;
        }
    }

    @action async toggleAvailability(driver) {
        try {
            await this.fetch.post(`ops/drivers/${driver.uuid}/availability`, {
                online: !driver.online,
                status: driver.status,
            });

            this.notifications.success('Driver availability updated.');
            await this.reload();
        } catch (error) {
            this.notifications.error(error.message ?? 'Unable to update availability.');
        }
    }

    @action async updateDriverStatus(driver, event) {
        try {
            await this.fetch.patch(`ops/drivers/${driver.uuid}`, {
                status: event.target.value,
            });

            this.notifications.success('Driver status updated.');
            await this.reload();
        } catch (error) {
            this.notifications.error(error.message ?? 'Unable to update driver.');
        }
    }

    @action async assignVehicle(driver, event) {
        try {
            await this.fetch.post(`ops/drivers/${driver.uuid}/assign-vehicle`, {
                vehicle_uuid: event.target.value || null,
            });

            this.notifications.success('Vehicle assignment updated.');
            await this.reload();
        } catch (error) {
            this.notifications.error(error.message ?? 'Unable to assign vehicle.');
        }
    }

    @action async approveDriver(driver) {
        try {
            await this.fetch.post(`ops/drivers/${driver.uuid}/approve`);
            this.notifications.success('Driver approved.');
            await this.reload();
        } catch (error) {
            this.notifications.error(error.message ?? 'Unable to approve driver.');
        }
    }

    @action async rejectDriver(driver) {
        try {
            await this.fetch.post(`ops/drivers/${driver.uuid}/reject`);
            this.notifications.success('Driver application rejected.');
            await this.reload();
        } catch (error) {
            this.notifications.error(error.message ?? 'Unable to reject driver.');
        }
    }

    @action async createPayoutBatch(driver) {
        try {
            await this.fetch.post(`ops/drivers/${driver.uuid}/payout-batches`);
            this.notifications.success('Driver payout batch queued.');
            await this.reload();
        } catch (error) {
            this.notifications.error(error.message ?? 'Unable to queue a payout batch.');
        }
    }
}

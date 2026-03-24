import Controller from '@ember/controller';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';

const defaultVehicleForm = () => ({
    name: '',
    make: '',
    model: '',
    year: '',
    plate_number: '',
    status: 'active',
});

export default class ConsoleOpsVehiclesController extends Controller {
    @service fetch;
    @service notifications;

    @tracked vehicles = [];
    @tracked vehicleForm = defaultVehicleForm();
    @tracked isSubmitting = false;

    get pendingReviewVehicles() {
        return this.vehicles.filter((vehicle) => vehicle.status === 'pending_review' && vehicle.portal_submission?.submitted_by_driver_uuid);
    }

    hydrate(payload) {
        this.vehicles = payload.vehicles ?? [];
    }

    async reload() {
        const payload = await this.fetch.get('ops/vehicles');
        this.hydrate(payload);
    }

    @action updateField(field, event) {
        this.vehicleForm = { ...this.vehicleForm, [field]: event.target.value };
    }

    @action async createVehicle(event) {
        event.preventDefault();
        this.isSubmitting = true;

        try {
            await this.fetch.post('ops/vehicles', {
                name: this.vehicleForm.name,
                make: this.vehicleForm.make || null,
                model: this.vehicleForm.model || null,
                year: this.vehicleForm.year ? Number(this.vehicleForm.year) : null,
                plate_number: this.vehicleForm.plate_number || null,
                status: this.vehicleForm.status,
            });

            this.notifications.success('Vehicle created.');
            this.vehicleForm = defaultVehicleForm();
            await this.reload();
        } catch (error) {
            this.notifications.error(error.message ?? 'Unable to create vehicle.');
        } finally {
            this.isSubmitting = false;
        }
    }

    @action async updateVehicleStatus(vehicle, event) {
        try {
            await this.fetch.patch(`ops/vehicles/${vehicle.uuid}`, {
                status: event.target.value,
            });

            this.notifications.success('Vehicle status updated.');
            await this.reload();
        } catch (error) {
            this.notifications.error(error.message ?? 'Unable to update vehicle.');
        }
    }
}

import Controller from '@ember/controller';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';

const defaultOrderForm = () => ({
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    pickup_address_line_1: '',
    pickup_city: '',
    pickup_country_code: 'UG',
    pickup_latitude: '',
    pickup_longitude: '',
    dropoff_address_line_1: '',
    dropoff_city: '',
    dropoff_country_code: 'UG',
    dropoff_latitude: '',
    dropoff_longitude: '',
    notes: '',
    driver_uuid: '',
});

const asNumber = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
};

export default class ConsoleOpsOrdersController extends Controller {
    @service fetch;
    @service notifications;

    @tracked orders = [];
    @tracked drivers = [];
    @tracked meta = {};
    @tracked orderForm = defaultOrderForm();
    @tracked isSubmitting = false;

    hydrate(payload) {
        this.orders = payload.orders ?? [];
        this.drivers = payload.drivers ?? [];
        this.meta = payload.meta ?? {};
    }

    async reload() {
        const payload = await this.fetch.get('ops/orders');
        this.hydrate(payload);
    }

    @action updateField(field, event) {
        this.orderForm = { ...this.orderForm, [field]: event.target.value };
    }

    @action async createOrder(event) {
        event.preventDefault();
        this.isSubmitting = true;

        try {
            await this.fetch.post('ops/orders', {
                customer_name: this.orderForm.customer_name,
                customer_phone: this.orderForm.customer_phone || null,
                customer_email: this.orderForm.customer_email || null,
                notes: this.orderForm.notes || null,
                driver_uuid: this.orderForm.driver_uuid || null,
                pickup: {
                    address_line_1: this.orderForm.pickup_address_line_1,
                    city: this.orderForm.pickup_city,
                    country_code: this.orderForm.pickup_country_code,
                    latitude: asNumber(this.orderForm.pickup_latitude),
                    longitude: asNumber(this.orderForm.pickup_longitude),
                },
                dropoff: {
                    address_line_1: this.orderForm.dropoff_address_line_1,
                    city: this.orderForm.dropoff_city,
                    country_code: this.orderForm.dropoff_country_code,
                    latitude: asNumber(this.orderForm.dropoff_latitude),
                    longitude: asNumber(this.orderForm.dropoff_longitude),
                },
            });

            this.notifications.success('Order created.');
            this.orderForm = defaultOrderForm();
            await this.reload();
        } catch (error) {
            this.notifications.error(error.message ?? 'Unable to create order.');
        } finally {
            this.isSubmitting = false;
        }
    }

    @action async assignDriver(order, event) {
        try {
            await this.fetch.post(`ops/orders/${order.uuid}/assign-driver`, {
                driver_uuid: event.target.value || null,
            });

            this.notifications.success('Driver assignment updated.');
            await this.reload();
        } catch (error) {
            this.notifications.error(error.message ?? 'Unable to assign driver.');
        }
    }

    @action async updateStatus(order, event) {
        try {
            await this.fetch.post(`ops/orders/${order.uuid}/status`, {
                status: event.target.value,
            });

            this.notifications.success('Order status updated.');
            await this.reload();
        } catch (error) {
            this.notifications.error(error.message ?? 'Unable to update order status.');
        }
    }

    @action async advanceStage(order) {
        try {
            await this.fetch.post(`ops/orders/${order.uuid}/advance-stage`);

            this.notifications.success('Order moved to the next stage.');
            await this.reload();
        } catch (error) {
            this.notifications.error(error.message ?? 'Unable to advance the order stage.');
        }
    }
}

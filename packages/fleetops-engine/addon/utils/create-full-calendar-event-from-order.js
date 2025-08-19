import { get } from '@ember/object';

export function createOrderEventTitle(order, intl) {
    const scheduledAtTime = get(order, 'scheduledAtTime');
    const driverAssignedName = get(order, 'driver_assigned.name');
    const noVehicleText = intl ? intl.t('fleet-ops.component.order.schedule-card.no-vehicle') : 'No vehicle';
    const vehicleAssignedName = get(order, 'vehicle.plateNumberModel') || noVehicleText;
    //const vehicleAssignedName = get(order, 'driver_assigned.vehicle_name') || intl.t('fleet-ops.component.order.schedule-card.no-vehicle');
    const destination = get(order, 'pickupName');

    let title = [];
    if (driverAssignedName) {
        title.push(`${driverAssignedName} @ ${scheduledAtTime}`);
        title.push(vehicleAssignedName);
        // Add null check here too
        const toText = intl ? intl.t('common.to') : 'to';
        title.push(`${toText} ${destination}`);
    } else {
        title.push(`${scheduledAtTime} to ${destination}`);
        title.push(vehicleAssignedName);
    }

    return title.filter(Boolean).join('\n');
}

export default function createFullCalendarEventFromOrder(order, intl) {
    const startDate = new Date(order.scheduled_at);
    const endDate = new Date(order.estimated_end_date);
    endDate.setDate(endDate.getDate() + 1);
    return {
        id: order.id,
        title: createOrderEventTitle(order, intl),
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        allDay: true,
        display: 'block',
        extendedProps: {
            order
        }
    };
}

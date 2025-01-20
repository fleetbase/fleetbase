import { get } from '@ember/object';

export function createOrderEventTitle(order) {
    const scheduledAtTime = get(order, 'scheduledAtTime');
    const driverAssignedName = get(order, 'driver_assigned.name');
    const vehicleAssignedName = get(order, 'driver_assigned.vehicle_name');
    const destination = get(order, 'pickupName');

    let title = [];
    if (driverAssignedName) {
        title.push(`${driverAssignedName} @ ${scheduledAtTime}`);
        title.push(vehicleAssignedName);
        title.push(`to ${destination}`);
    } else {
        title.push(`${scheduledAtTime} to ${destination}`);
        title.push(vehicleAssignedName);
    }

    return title.filter(Boolean).join('\n');
}

export default function createFullCalendarEventFromOrder(order) {
    return {
        id: order.id,
        title: createOrderEventTitle(order),
        start: order.scheduled_at,
        allDay: true,
        display: 'block',
    };
}

import { get } from '@ember/object';

export function createOrderEventTitle(order) {
    const scheduledAtTime = get(order, 'scheduledAtTime');
    const driverAssignedName = get(order, 'driver_assigned.name');
    const vehicleAssignedName = get(order, 'driver_assigned.vehicle_name') || "No vehicle";
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
    const startDate = new Date(order.scheduled_at);
    const endDate = new Date(order.estimated_end_date);
    endDate.setDate(endDate.getDate() + 1);
    return {
        id: order.id,
        title: createOrderEventTitle(order),
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        allDay: true,
        display: 'block',
    };
}

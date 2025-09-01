import { get } from '@ember/object';
import { inject as service } from '@ember/service';
// Function to create calendar events for driver unavailability (leave)
export default function createFullCalendarEventFromLeave(unavailability, intl) {
   
    if (!unavailability.start_date || !unavailability.end_date) {
        return null;
    }

    const startDate = new Date(unavailability.start_date);
    const endDate = new Date(unavailability.end_date);
    endDate.setDate(endDate.getDate() + 1);

    // Safely get driver/user name; if missing, treat as maintenance
    const driverName = unavailability?.user?.name || '';
    const isMaintenance = unavailability.unavailability_type === 'vehicle' || !driverName;

    // Build title
    let title;
    if (isMaintenance) {
        const vehicleName =
            unavailability?.vehicle?.plate_number ||
            unavailability?.vehicle?.display_name ||
            '';
        const onMaintenance = (intl?.t && intl.t('fleet-ops.component.maintenance-schedule-form-panel.on-maintenance')) || 'on maintenance';
        title = vehicleName ? `${vehicleName} ${onMaintenance}` : onMaintenance;
    } else {
        const onLeave = (intl?.t && intl.t('fleet-ops.component.order.schedule-card.on-leave')) || 'on leave';
        title = `${driverName} ${onLeave}`;
    }

    // Choose classes and colors
    const classNames = isMaintenance ? 'leave-event maintenance-event' : 'leave-event';
    const backgroundColor = isMaintenance ? '#7f7f7f' : undefined; // grey for maintenance

    return {
        id: unavailability.public_id,
        title,
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        allDay: true,
        display: 'block',
        className: classNames, // CSS classes for styling the leave/maintenance event
        description: `Reason: ${unavailability.reason ?? ''}`,
        ...(backgroundColor ? { backgroundColor } : {}),
    };
}

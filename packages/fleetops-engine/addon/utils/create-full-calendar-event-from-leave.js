import { get } from '@ember/object';
import { inject as service } from '@ember/service';
// Function to create calendar events for driver unavailability (leave)
export default function createFullCalendarEventFromLeave(unavailability, intl) {
   
    if (!unavailability.start_date || !unavailability.end_date) {
        console.error('Missing start_date or end_date:', unavailability);
        return null;
    }

    const startDate = new Date(unavailability.start_date);
    const endDate = new Date(unavailability.end_date);
    endDate.setDate(endDate.getDate() + 1);
    return {
        id: unavailability.public_id,
        title: `${unavailability.user.name} ${intl.t('fleet-ops.component.order.schedule-card.on-leave')}`,
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        allDay: true,
        display: 'block',
        className: 'leave-event', // CSS class for styling the leave event
        description: `Reason: ${unavailability.reason}`,
    };
}

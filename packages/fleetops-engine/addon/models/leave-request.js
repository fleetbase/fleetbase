import Model, { attr, belongsTo } from '@ember-data/model';

export default class LeaveRequestModel extends Model {
    // Core payload fields
    @attr('string') user_uuid;
    @attr('string') vehicle_uuid;
    @attr('string') start_date; // YYYY-MM-DD
    @attr('string') end_date;   // YYYY-MM-DD
    @attr('string') reason;
    @attr('string') unavailability_type; // e.g. 'vehicle'

    // Common server-provided fields (optional but useful)
    @attr('string') public_id;
    @attr('string') vehicle_name;
    @attr('date') created_at;

    // UI/relationship helpers
    @belongsTo('vehicle', { async: false, inverse: null }) vehicle_assigned;

    // UI-only helper fields used by the form; not required by API but convenient
    @attr() scheduledAt;         // Date object or ISO string for start datetime picker
    @attr() estimatedEndDate;    // Date object or ISO string for end datetime picker
    @attr('string') notes;
}

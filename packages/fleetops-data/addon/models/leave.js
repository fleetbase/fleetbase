// app/models/leaves.js
import Model, { attr, belongsTo } from '@ember-data/model';
import { computed } from '@ember/object';
import { parseISO, format } from 'date-fns';

export default class LeavesModel extends Model {
    // Primary Key
    @attr('string') id;
    @attr('string') public_id;

    // Foreign Keys
    @attr('string') driver_uuid;
    @attr('string') processed_by; // UUID of the user who processed

    // Relationships (if your API includes these as relationships)
    @belongsTo('driver', { async: true, inverse: null }) driver;
    @belongsTo('user', { async: true, inverse: null }) processed_by_user;

    // Leave Details
    @attr('string') start_date;
    @attr('string') end_date;
    @attr('number') total_days;
    @attr('string') leave_type;
    @attr('string') reason;
    @attr('string') status;

    // Timestamps
    @attr('string') created_at;
    @attr('string') updated_at;

    // Leave Balance (from driver)
    @attr('number') leave_balance;

    // Attachments (if any)
    @attr() files;

    // Optionally, if you want to store the full driver/user object for easier access
    // (only if your API includes these as embedded objects, otherwise use relationships above)
    // @attr() driver;
    // @attr() processed_by_user;

    @computed('start_date')
  get formattedStartDate() {
    if (!this.start_date) return '';
    return format(parseISO(this.start_date), "MMMM do, yyyy h:mm a");
  }

  @computed('end_date')
  get formattedEndDate() {
    if (!this.end_date) return '';
    return format(parseISO(this.end_date), "MMMM do, yyyy h:mm a");
  }
}
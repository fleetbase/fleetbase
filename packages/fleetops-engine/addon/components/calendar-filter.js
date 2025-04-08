// components/fleet-ops/calendar-filter.js
import Component from '@glimmer/component';
import { action } from '@ember/object';

/**
 * Calendar Filter Component - Octane style
 * This component provides filter controls for the fleet operations calendar
 */
export default class CalendarFilterComponent extends Component {
  /**
   * Action to handle driver selection
   * @param {Object} driver - The selected driver object
   */
  @action
  handleDriverChange(driver) {
    this.args.onDriverChange?.(driver);
  }
  
  /**
   * Action to handle status selection
   * @param {Object} status - The selected status object
   */
  @action
  handleStatusChange(status) {
    this.args.onStatusChange?.(status);
  }
  
  /**
   * Action to apply filters
   */
  @action
  handleApplyFilters() {
    this.args.applyFilters?.();
  }
  
  /**
   * Action to clear filters
   */
  @action
  handleClearFilters() {
    this.args.clearFilters?.();
  }
}
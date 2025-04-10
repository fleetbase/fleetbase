// components/fleet-ops/calendar-filter.js
import Component from '@glimmer/component';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';

/**
 * Calendar Filter Component - Octane style
 * This component provides filter controls for the fleet operations calendar
 */
export default class CalendarFilterComponent extends Component {
  // Track the order ID input value
  @tracked tempOrderId = '';
  @tracked isLoading = false;

  constructor() {
    super(...arguments);
    // Initialize with current filter value if it exists
    this.tempOrderId = this.args.order_id_filter || '';
  }
  // Watch for changes to the loading state from the parent
  get loading() {
    // If parent explicitly passes loading state, use that
    if (this.args.isLoading !== undefined) {
      return this.args.isLoading;
    }
    // Otherwise use local loading state
    return this.isLoading;
  }
  /**
   * Action to handle driver selection
   * @param {Object} driver - The selected driver object
   */
  @action
  handleDriverChange(driver) {
    if (this.args.onDriverChange) {
      // If there's a specific handler for driver changes, use it
      this.args.onDriverChange(driver);
    } else {
      if (driver) {
        // Set the driver filter to the name or id based on your parent component's expectations
        this.args.driver_filter = driver.name || driver.id;
        this.args.selectedDriver = driver;
      } else {
        this.args.driver_filter = '';
        this.args.selectedDriver = null;
      }
    }
    
    this.triggerFilterApply();
  }

  /**
   * Action to handle status selection
   * @param {Object} status - The selected status object
   */
  @action
  handleStatusChange(status) {
    if (this.args.onStatusChange) {
      // If there's a specific handler for status changes, use it
      this.args.onStatusChange(status);
    } else {
      if (status) {
        this.args.status_filter = status.id || status.name;
        this.args.selectedStatus = status;
      } else {
        this.args.status_filter = '';
        this.args.selectedStatus = null;
      }
    }
    
    // Apply filters after changing the status
    this.triggerFilterApply();
  }

  /**
   * Action to handle order ID input changes
   * @param {Event} event - The input event
   */
  @action
  handleOrderIdChange(event) {
    // Update the tempOrderId when the user types
    this.tempOrderId = event.target.value;
  }

  /**
   * Action to handle order ID input blur event
   */
  @action
  handleOrderIdBlur() {
    // Only update if the value has changed and we have a callback
    if (this.args.order_id_filter !== this.tempOrderId && typeof this.args.onOrderIdChange === 'function') {
      this.args.onOrderIdChange(this.tempOrderId);
      this.triggerFilterApply();
    }
  }

  /**
   * Action to handle order ID input key down event
   * @param {KeyboardEvent} event - The keyboard event
   */
  @action
  handleOrderIdKeyDown(event) {
    // Apply the filter when the user presses Enter
    if (event.key === 'Enter' && typeof this.args.onOrderIdChange === 'function') {
      event.preventDefault();
      this.args.onOrderIdChange(this.tempOrderId);
      this.triggerFilterApply();
    }
  }

  /**
   * Update the order ID filter in the parent component
   * @private
   */
  updateOrderIdFilter() {
    if (this.args.onOrderIdChange) {
      // If there's a specific handler for order ID changes, use it
      this.args.onOrderIdChange(this.tempOrderId);
    } else {
      // Otherwise, set the filter value directly if it's exposed
      this.args.order_id_filter = this.tempOrderId;
    }
  }

  /**
   * Action to apply filters
   */
  @action
  handleApplyFilters() {
    // Update order ID filter before applying
    this.updateOrderIdFilter();
    this.triggerFilterApply();
  }

  /**
   * Action to clear filters
   */
  @action
  handleClearFilters() {
    // Reset the local order ID value
    this.tempOrderId = '';
    if (this.args.isLoading === undefined) {
      this.isLoading = true;
    }
    
    // Call parent clear action
    if (typeof this.args.clearFilters === 'function') {
      const result = this.args.clearFilters();
      
      // Handle promise return to reset loading state
      if (this.args.isLoading === undefined) {
        Promise.resolve(result).finally(() => {
          this.isLoading = false;
        });
      }
    } else {
      // If no clear action, reset loading
      if (this.args.isLoading === undefined) {
        this.isLoading = false;
      }
    }
  }


  triggerFilterApply() {
    // Set loading state to true when starting the filter operation
    this.isLoading = true;
    
    try {
      // Use the specific handler if provided
      if (typeof this.args.applyFilters === 'function') {
        // Wrap the applyFilters call in Promise.resolve() to handle both 
        // promise and non-promise return values
        const filterPromise = Promise.resolve(this.args.applyFilters());
        
        // When the promise completes (whether successful or failed), set loading to false
        filterPromise.finally(() => {
          this.isLoading = false;
        });
      } else {
        // If no apply filters method is provided, just stop loading
        this.isLoading = false;
      }
    } catch (error) {
      // In case applyFilters doesn't return a promise or throws synchronously
      this.isLoading = false;
      console.error('Error applying filters:', error);
    }
  }
}
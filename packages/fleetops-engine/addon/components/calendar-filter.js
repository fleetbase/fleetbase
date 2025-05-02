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
    // Force set the loading state to true
    this.isLoading = true;
    
    // Add a small delay to ensure the loading state is applied
    // This helps with the browser's render cycle
    setTimeout(() => {
      if (this.args.onDriverChange) {
        try {
          // Call the parent's handler
          const result = this.args.onDriverChange(driver);
          
          // Handle both promise and non-promise returns
          if (result && typeof result.then === 'function') {
            // It's a promise
            result.finally(() => {
              this.isLoading = false;
            });
          } else {
            // Not a promise, manually set loading to false after a delay
            setTimeout(() => {
              this.isLoading = false;
            }, 500);
          }
        } catch (error) {
          console.error('Error in handleDriverChange:', error);
          this.isLoading = false;
        }
      } else {
        // Handle the change locally
        if (driver) {
          this.args.driver_filter = driver.id || '';
          this.args.selectedDriver = driver;
        } else {
          this.args.driver_filter = '';
          this.args.selectedDriver = null;
        }
        
        // Apply filters with a delay to ensure the loading spinner appears
        setTimeout(() => {
          this.triggerFilterApply();
        }, 100);
      }
    }, 0);
  }

  /**
   * Action to handle status selection
   * @param {Object} status - The selected status object
   */
  @action
  handleStatusChange(status) {
    // Force set the loading state to true
    this.isLoading = true;
    
    // Add a small delay to ensure the loading state is applied
    setTimeout(() => {
      if (this.args.onStatusChange) {
        try {
          // Call the parent's handler
          const result = this.args.onStatusChange(status);
          
          // Handle both promise and non-promise returns
          if (result && typeof result.then === 'function') {
            // It's a promise
            result.finally(() => {
              this.isLoading = false;
            });
          } else {
            // Not a promise, manually set loading to false after a delay
            setTimeout(() => {
              this.isLoading = false;
            }, 500);
          }
        } catch (error) {
          console.error('Error in handleStatusChange:', error);
          this.isLoading = false;
        }
      } else {
        // Handle the change locally
        if (status) {
          this.args.status_filter = status.id || status.name;
          this.args.selectedStatus = status;
        } else {
          this.args.status_filter = '';
          this.args.selectedStatus = null;
        }
        
        // Apply filters with a delay to ensure the loading spinner appears
        setTimeout(() => {
          this.triggerFilterApply();
        }, 100);
      }
    }, 0);
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
      // Force set the loading state to true
      this.isLoading = true;
      
      // Add a small delay to ensure the loading state is applied
      setTimeout(() => {
        try {
          // Call the parent's handler
          const result = this.args.onOrderIdChange(this.tempOrderId);
          
          // Handle both promise and non-promise returns
          if (result && typeof result.then === 'function') {
            // It's a promise
            result.finally(() => {
              this.isLoading = false;
            });
          } else {
            // Not a promise, manually set loading to false after a delay
            setTimeout(() => {
              this.isLoading = false;
            }, 500);
          }
        } catch (error) {
          console.error('Error in handleOrderIdBlur:', error);
          this.isLoading = false;
        }
      }, 0);
    }
  }

  @action
  handleOrderIdKeyDown(event) {
    // Apply the filter when the user presses Enter
    if (event.key === 'Enter' && typeof this.args.onOrderIdChange === 'function') {
      // Force set the loading state to true
      this.isLoading = true;
      event.preventDefault();
      
      // Add a small delay to ensure the loading state is applied
      setTimeout(() => {
        try {
          // Call the parent's handler
          const result = this.args.onOrderIdChange(this.tempOrderId);
          
          // Handle both promise and non-promise returns
          if (result && typeof result.then === 'function') {
            // It's a promise
            result.finally(() => {
              this.isLoading = false;
            });
          } else {
            // Not a promise, manually set loading to false after a delay
            setTimeout(() => {
              this.isLoading = false;
            }, 500);
          }
        } catch (error) {
          console.error('Error in handleOrderIdKeyDown:', error);
          this.isLoading = false;
        }
      }, 0);
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
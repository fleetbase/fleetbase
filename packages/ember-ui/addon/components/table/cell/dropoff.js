import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';

export default class TableCellWaypointsComponent extends Component {
  @service dropdownManager;
  
  @tracked isDropdownOpen = false;
  @tracked _dropdownElement = null;

  get waypoints() {
    const dropoffName = this.args.value || '';
    return dropoffName.split(',').map(w => w.trim()).filter(Boolean);
  }

  get hasMultipleWaypoints() {
    return this.waypoints.length > 1;
  }

  get singleWaypoint() {
    return this.waypoints.length === 1 ? this.waypoints[0] : null;
  }

  get lastWaypoint() {
    return this.waypoints[this.waypoints.length - 1];
  }

  get displayWaypoints() {
    return this.waypoints;
  }

  get routeSegments() {
    console.log("welell", this.args.row.payload);
    return this.args.row?.payload?.route_segments || [];
  }

  @action
  toggleDropdown(event) {
    event.stopPropagation();
    
    if (this.isDropdownOpen) {
      this.closeDropdown();
    } else {
      // Notify the service to close other dropdowns and open this one
      this.dropdownManager.openDropdown(this);
      this.isDropdownOpen = true;
    }
  }

  @action
  closeDropdown() {
    this.isDropdownOpen = false;
    this.dropdownManager.closeDropdown(this);
  }

  @action
  registerClickOutside(element) {
    this._dropdownElement = element;
    const handleClick = (e) => {
      if (!element.contains(e.target)) {
        this.closeDropdown();
      }
    };

    document.addEventListener('click', handleClick);
    this._clickOutsideHandler = handleClick;
  }

  willDestroy() {
    super.willDestroy();
    if (this._clickOutsideHandler) {
      document.removeEventListener('click', this._clickOutsideHandler);
      this._clickOutsideHandler = null;
    }
    // Clean up from the service when component is destroyed
    this.dropdownManager.closeDropdown(this);
  }
}
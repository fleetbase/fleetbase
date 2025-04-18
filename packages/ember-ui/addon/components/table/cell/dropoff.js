import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

export default class TableCellWaypointsComponent extends Component {
  @tracked isDropdownOpen = false;

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

  @action
  toggleDropdown(event) {
    event.stopPropagation();
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  @action
  closeDropdown() {
    this.isDropdownOpen = false;
  }

  @action
  registerClickOutside(element) {
    const handleClick = (e) => {
      if (!element.contains(e.target)) {
        this.closeDropdown();
      }
    };

    document.addEventListener('click', handleClick);
    element.__clickOutsideHandler__ = handleClick;
  }

  willDestroy() {
    if (this.element && this.element.__clickOutsideHandler__) {
      document.removeEventListener('click', this.element.__clickOutsideHandler__);
    }
  }
}
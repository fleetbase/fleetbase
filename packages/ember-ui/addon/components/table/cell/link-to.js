import Component from '@glimmer/component';

export default class TableCellLinkToComponent extends Component {
  get waypoints() {
    // If waypointCheck is enabled, get waypoints from the order model
    if (this.args.column?.waypointCheck) {
      const order = this.args.row;
      if (order?.payload?.waypoints) {
        return order.payload.waypoints;
      }
      return [];
    }
    // For non-waypoint columns, return empty array
    return [];
  }

  get hasMultipleWaypoints() {
    return this.waypoints.length > 2;
  }

  get shouldShowLink() {
    // Only apply waypoint logic if the column has the waypointCheck flag
    if (this.args.column?.waypointCheck) {
      return this.hasMultipleWaypoints;
    }
    
    // For all other cases, always show the link
    return true;
  }
}

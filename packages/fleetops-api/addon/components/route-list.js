import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

export default class RouteListComponent extends Component {
    @tracked isWaypointsCollapsed = true;

    @action toggleWaypointsCollapse() {
        this.isWaypointsCollapsed = !this.isWaypointsCollapsed;
    }
}

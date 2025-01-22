import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';

export default class LayoutHeaderSidebarToggleComponent extends Component {
    @service universe;
    @tracked isSidebarVisible = true;

    @action toggleSidebar() {
        if (this.args.disabled === true) {
            return;
        }

        const sidebar = this.universe.sidebarContext;

        if (this.isSidebarVisible) {
            sidebar.hideNow();
        } else {
            sidebar.show();
        }

        this.isSidebarVisible = !this.isSidebarVisible;

        if (typeof this.args.onToggle === 'function') {
            this.args.onToggle(sidebar, this.isSidebarVisible);
        }
    }
}

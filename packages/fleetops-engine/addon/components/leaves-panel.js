import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import contextComponentCallback from '@fleetbase/ember-core/utils/context-component-callback';

export default class LeavesPanelComponent extends Component {
    @tracked leave = this.args.leave;

    constructor() {
        super(...arguments);
        console.log('LeavesPanelComponent loaded');
        console.log(this.leave);
    }

    @action onEdit() {
        const isActionOverrided = contextComponentCallback(this, 'onEdit', this.leave);

        if (!isActionOverrided) {
            this.contextPanel.focus(this.leave, 'editing', {
                onAfterSave: () => {
                    this.contextPanel.clear();
                },
            });
        }
    }

    @action onPressCancel() {
        this.contextPanel.clear();
    }

    @action
    async approveLeave(leave) {
        leave.status = 'approved';
        await leave.save();
        // Optionally show a notification
    }

    @action
    async rejectLeave(leave) {
        leave.status = 'rejected';
        await leave.save();
        // Optionally show a notification
    }
}

import Component from '@glimmer/component';
import { action } from '@ember/object';
import contextComponentCallback from 'your-app/utils/context-component-callback';

export default class LeavesPanelComponent extends Component {
    constructor() {
        super(...arguments);
        console.log('LeavesPanelComponent loaded');
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
}

import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';

export default class TimelineItemComponent extends Component {
    @tracked isActive = false;

    constructor(owner, { activeStatus, activity }) {
        super(...arguments);

        this.isActive = typeof activeStatus === 'string' && typeof activity.code === 'string' && activeStatus.toLowerCase() === activity.code.toLowerCase();
        if (typeof activity.isActive === 'boolean') {
            this.isActive = activity.isActive;
        }
    }
}

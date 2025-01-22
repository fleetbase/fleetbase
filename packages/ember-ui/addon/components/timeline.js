import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { isArray } from '@ember/array';

export default class TimelineComponent extends Component {
    @tracked startIndex = 0;
    @tracked endIndex = 0;
    @tracked visibleActivities = [];
    @tracked activity = [];

    constructor(owner, { activity }) {
        super(...arguments);
        this.activity = isArray(activity) ? activity : [];
        this.startIndex = 0;
        this.endIndex = Math.min(2, this.activity.length - 1);
        this.visibleActivities = this.activity.slice(this.startIndex, this.endIndex + 1);
    }

    @action setupComponent(timelineNode) {
        this.timelineNode = timelineNode;
        this.timelineWrapperNode = timelineNode.querySelector('.timeline-wrapper');
        this.timelineItemsContainerNode = this.timelineWrapperNode.firstElementChild;
    }

    @action previous() {
        if (this.startIndex > 0) {
            this.setTimelinePosition(this.startIndex - 1, this.endIndex - 1);
        }
    }

    @action next() {
        if (this.endIndex < this.activity.length - 1) {
            this.setTimelinePosition(this.startIndex + 1, this.endIndex + 1);
        }
    }

    setTimelinePosition(startIndex, endIndex) {
        this.startIndex = startIndex;
        this.endIndex = endIndex;
        this.updateTimelineContainerStyle({
            transform: `translateX(calc(-${this.startIndex * (100 / 3)}%))`,
        });
        this.visibleActivities = this.activity.slice(this.startIndex, this.endIndex + 1);
    }

    updateTimelineContainerStyle(style = {}) {
        const styleProperties = Object.keys(style);

        for (let i = 0; i < styleProperties.length; i++) {
            const styleProp = styleProperties.objectAt(i);
            const value = style[styleProp];

            if (value) {
                this.timelineItemsContainerNode.style[styleProp] = value;
            }
        }
    }
}

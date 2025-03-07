import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { isArray } from '@ember/array';

export default class TimelineComponent extends Component {
    @tracked startIndex = 0;
    @tracked endIndex = 0;
    @tracked visibleActivities = [];
    @tracked activity = [];
    @tracked itemsPerPage = 3;
    @tracked showAll = false;

    constructor(owner, args) {
        super(...arguments);
        const activity = args.activity || [];
        this.activity = isArray(activity) ? activity : [];
        
        this.itemsPerPage = args.itemsPerPage || 3;
        
        this.startIndex = 0;
        this.endIndex = Math.min(this.startIndex + this.itemsPerPage - 1, this.activity.length - 1);
        
        this.updateVisibleActivities();
    }

    @action setupComponent(timelineNode) {
        this.timelineNode = timelineNode;
        this.timelineWrapperNode = timelineNode.querySelector('.timeline-wrapper');
        this.timelineItemsContainerNode = this.timelineWrapperNode.firstElementChild;
    }

    @action previous() {
        if (this.startIndex > 0) {
            const newStartIndex = Math.max(0, this.startIndex - this.itemsPerPage);
            const newEndIndex = Math.min(newStartIndex + this.itemsPerPage - 1, this.activity.length - 1);
            this.setTimelinePosition(newStartIndex, newEndIndex);
        }
    }
    
    @action next() {
        if (this.endIndex < this.activity.length - 1) {
            const newStartIndex = this.startIndex + this.itemsPerPage;
            const newEndIndex = Math.min(newStartIndex + this.itemsPerPage - 1, this.activity.length - 1);
            this.setTimelinePosition(newStartIndex, newEndIndex);
        }
    }
    
    @action showAllActivities() {
        this.showAll = true;
        
        // Create a grid layout for all activities
        if (this.timelineItemsContainerNode) {
            // Reset any translation
            this.timelineItemsContainerNode.style.transform = '';
            
            // Apply grid layout for all items
            this.timelineItemsContainerNode.style.display = 'grid';
            this.timelineItemsContainerNode.style.gridTemplateColumns = 'repeat(3, 1fr)';
            this.timelineItemsContainerNode.style.gridAutoFlow = 'row';
            this.timelineItemsContainerNode.style.overflow = 'visible';
            this.timelineItemsContainerNode.style.maxHeight = 'none';
        }
        
        // Show all activities
        this.visibleActivities = this.activity;
    }

    updateVisibleActivities() {
        if (this.showAll) {
            this.visibleActivities = this.activity;
        } else {
            this.visibleActivities = this.activity.slice(this.startIndex, this.endIndex + 1);
        }
    }

    setTimelinePosition(startIndex, endIndex) {
        this.startIndex = startIndex;
        this.endIndex = endIndex;
        
        // Reset to standard layout if it was in "show all" mode
        if (this.showAll) {
            this.showAll = false;
            if (this.timelineItemsContainerNode) {
                // Reset to original layout
                this.timelineItemsContainerNode.style.display = 'grid';
                this.timelineItemsContainerNode.style.gridTemplateColumns = 'repeat(3, 1fr)';
                this.timelineItemsContainerNode.style.gridAutoFlow = 'column';
                this.timelineItemsContainerNode.style.maxHeight = '';
            }
        }
        
        // Show only current page
        this.visibleActivities = this.activity.slice(this.startIndex, this.endIndex + 1);
    }
    
    updateTimelineContainerStyle(style = {}) {
        if (!this.timelineItemsContainerNode) return;
        
        const styleProperties = Object.keys(style);
        
        for (let i = 0; i < styleProperties.length; i++) {
            const styleProp = styleProperties[i];
            const value = style[styleProp];
            
            if (value) {
                this.timelineItemsContainerNode.style[styleProp] = value;
            }
        }
    }
}
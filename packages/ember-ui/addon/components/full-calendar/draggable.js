import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { Draggable } from '@fullcalendar/interaction';

export default class DraggableFullcalendarEventComponent extends Component {
    @tracked draggable;
    @tracked eventData = {};
    @tracked disabled = false;

    constructor(owner, { eventData = {}, disabled = false }) {
        super(...arguments);
        this.eventData = eventData;
        this.disabled = disabled;
    }

    @action makeDraggable(element) {
        this.destroyDraggable();
        this.ready(element);
        if (this.disabled) {
            return;
        }

        this.draggable = new Draggable(element);
        this.dragReady(this.draggable);
    }

    @action argsChanged(element, [disabled = false]) {
        this.disabled = disabled;
        this.makeDraggable(element);
    }

    ready() {
        if (typeof this.args.onReady === 'function') {
            this.args.onReady(...arguments);
        }
    }

    dragReady() {
        if (typeof this.args.onDragReady === 'function') {
            this.args.onDragReady(...arguments);
        }
    }

    destroyDraggable() {
        if (this.draggable && typeof this.draggable.destroy === 'function') {
            this.draggable.destroy();
        }
    }
}

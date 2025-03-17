import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { classify } from '@ember/string';
import { Calendar } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';

export default class FullCalendarComponent extends Component {
    /**
     * @var {HTMLElement} calendarEl
     */
    @tracked calendarEl;

    /**
     * @var {Calendar} calendar
     * @package @fullcalendar/core
     */
    @tracked calendar;

    /**
     * Default events to trigger for
     * @var {Array}
     */
    @tracked events = ['dateClick', 'drop', 'eventReceive', 'eventClick', 'eventDragStop', 'eventDrop', 'eventAdd', 'eventChange', 'eventRemove'];

    /**
     * Tracked calendar event listeners
     * @var {Array}
     */
    @tracked _listeners = [];

    /**
     * Initializes and renders the calendar component
     *
     * @param {HTMLElement} calendarEl
     */
    @action setupCalendar(calendarEl) {
        // track calendar htmlelement
        this.calendarEl = calendarEl;

        // get events
        let events = this.args.events || [];

        // initialize calendar
        this.calendar = new Calendar(calendarEl, {
            events,
            plugins: [dayGridPlugin, interactionPlugin],
            initialView: 'dayGridWeek',
            editable: false,
            height: 'auto',  // ✅ Automatically adjust height based on data
            contentHeight: 'auto', // ✅ Allow height to expand as needed
            expandRows: true, // ✅ Ensures rows expand instead of shrinking
            dayMaxEventRows: true,
            nowIndicator: true,
            buttonText: {
                today: 'Today',
                month: 'Month',
                week: 'Week',
                day: 'Day'
            }, // Show current time indicator
            headerToolbar: {
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridWeek,dayGridMonth,dayGridDay',
            },
            views: {
                dayGridMonth: {
                    dayCount: 21, // Show only 21 days at a time
                    // duration: { days: 21 }
                }
            },
            
        });

        // trigger callback on initialize
        if (typeof this.args.onInit === 'function') {
            this.args.onInit(this.calendar);
        }

        // render calendar
        this.calendar.render();

        // listen for events
        this.createCalendarEventListeners();
    }

    triggerCalendarEvent(eventName, ...params) {
        if (typeof this[eventName] === 'function') {
            this[eventName](...params);
        }

        if (typeof this.args[eventName] === 'function') {
            this.args[eventName](...params);
        }
    }

    createCalendarEventListeners() {
        for (let i = 0; i < this.events.length; i++) {
            const eventName = this.events.objectAt(i);
            const callbackName = `on${classify(eventName)}`;

            if (typeof this.args[callbackName] === 'function') {
                // track for destroy purposes
                this._listeners.pushObject({
                    eventName,
                    callbackName,
                });

                // create listener
                this.calendar.on(eventName, this.triggerCalendarEvent.bind(this, callbackName));
            }
        }

        // check for custom events
        // @todo
    }

    destroyCalendarEventListeners() {
        for (let i = 0; i < this._listeners.length; i++) {
            const listener = this._listeners.objectAt(i);
            const { eventName, callbackName } = listener;

            // kill listener
            this.calendar.off(eventName, this.triggerCalendarEvent.bind(this, callbackName));
        }
    }
    @action
    refreshCalendar(updatedEvents) {
        if (this.calendar) {
            this.calendar.removeAllEvents(); // Clear existing events
            this.calendar.addEventSource(updatedEvents); // Add new events
            this.calendar.render(); // Render the calendar
        } else {
            console.error('FullCalendar instance is not available');
        }
    }
}

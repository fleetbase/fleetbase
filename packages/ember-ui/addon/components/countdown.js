import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { formatDuration, intervalToDuration } from 'date-fns';
import { isArray } from '@ember/array';
import { run } from '@ember/runloop';
import { computed } from '@ember/object';

export default class CountdownComponent extends Component {
    /**
     * An array that defines the units to display in the countdown.
     *
     * @memberof CountdownComponent
     * @type {Array<string>}
     * @default ['seconds']
     */
    @tracked display = ['seconds'];

    /**
     * The remaining time in the countdown.
     *
     * @memberof CountdownComponent
     * @type {string}
     */
    @tracked remaining;

    /**
     * The duration of the countdown, specified in days, hours, minutes, and seconds.
     *
     * @memberof CountdownComponent
     * @type {Object}
     */
    @tracked duration = {};

    /**
     * The interval ID for the countdown timer.
     *
     * @memberof CountdownComponent
     * @type {number}
     */
    @tracked interval;

    /**
     * Creates an instance of CountdownComponent.
     *
     * @param {Object} owner - The owning object.
     * @param {Object} options - Options for configuring the countdown.
     * @param {Date} options.expiry - The expiration date for the countdown.
     * @param {number} options.hours - The initial hours for the countdown.
     * @param {number} options.minutes - The initial minutes for the countdown.
     * @param {number} options.seconds - The initial seconds for the countdown.
     * @param {number} options.days - The initial days for the countdown.
     * @param {(string|Array<string>)} options.display - The units to display in the countdown.
     */
    constructor(owner, { expiry, hours, minutes, seconds, days, display }) {
        super(...arguments);

        this.setDuration(
            {
                days,
                hours,
                minutes,
                seconds,
            },
            expiry
        );

        if (display) {
            if (typeof display === 'string' && display.includes(',')) {
                display = display.split(',');
            }

            if (isArray(display)) {
                this.display = display;
            }
        }

        this.startCountdown();
    }

    @computed('remaining', 'duration') get remainingClass() {
        // Customize the threshold and class names as needed
        if (this.remaining && this.durationToSeconds(this.duration) <= 5) {
            return 'remaining-low'; // Add a CSS class for low time
        } else {
            return 'remaining-normal'; // Add a default CSS class
        }
    }

    setDuration(duration = {}, expiry) {
        if (expiry instanceof Date) {
            // use the date provided to set the hours minutes seconds
            duration = intervalToDuration({ start: new Date(), end: expiry });
        }

        // handle when only 2 minutes
        if (duration && duration.minutes < 3) {
            duration = {
                ...duration,
                seconds: duration.seconds + duration.minutes * 60,
                minutes: 0,
            };
        }

        this.duration = duration;
    }

    /**
     * Starts the countdown timer.
     *
     * @memberof CountdownComponent
     * @method
     */
    startCountdown() {
        this.interval = setInterval(() => {
            run(() => {
                let { duration } = this;

                // if onlyDisplaySeconds === true
                if (this.args.onlyDisplaySeconds === true) {
                    duration = {
                        seconds: this.durationToSeconds(this.duration),
                    };
                }

                this.remaining = formatDuration(duration);

                // decrement seconds
                duration.seconds--;

                // set duration
                if (duration.seconds < 0) {
                    duration.seconds = 0; // Stop the countdown at 0
                    clearInterval(this.interval);

                    if (typeof this.args.onCountdownEnd === 'function') {
                        this.args.onCountdownEnd();
                    }

                    if (typeof this.args.onEnd === 'function') {
                        this.args.onEnd();
                    }
                }
            });
        }, 1000);
    }

    /**
     * Converts the duration object to total seconds.
     *
     * @memberof CountdownComponent
     * @method
     * @param {Object} duration - The duration object.
     * @returns {number} - The total seconds.
     */
    durationToSeconds(duration) {
        const { years = 0, months = 0, weeks = 0, days = 0, hours = 0, minutes = 0, seconds = 0 } = duration;
        const totalSeconds = years * 365 * 24 * 60 * 60 + months * 30 * 24 * 60 * 60 + weeks * 7 * 24 * 60 * 60 + days * 24 * 60 * 60 + hours * 60 * 60 + minutes * 60 + seconds;

        return totalSeconds;
    }

    /**
     * Restarts the countdown by resetting the timeRemaining property and clearing the interval.
     *
     * @method restartCountdown
     */
    restartCountdown() {
        clearInterval(this.interval);
        // Reset properties
        this.remaining = null;
        this.duration = {
            days: this.args.days || 0,
            hours: this.args.hours || 0,
            minutes: this.args.minutes || 0,
            seconds: this.args.seconds || 0,
        };
        this.startCountdown();
    }

    /**
     * Cleans up the interval when the component is being destroyed.
     * @method willDestroy
     */
    willDestroy() {
        super.willDestroy(...arguments);
        clearInterval(this.interval);
    }
}

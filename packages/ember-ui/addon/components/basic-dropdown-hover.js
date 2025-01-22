import Component from '@glimmer/component';
import { cancel, later } from '@ember/runloop';
import { action } from '@ember/object';

export default class BasicDropdownHoverComponent extends Component {
    @action open(dropdown) {
        if (this.closeTimer) {
            cancel(this.closeTimer);
            this.closeTimer = null;
        } else {
            let openFn = () => {
                this.openTimer = null;
                dropdown.actions.open();
            };
            let openDelay = this.getDelay('open');
            if (openDelay) {
                this.openTimer = later(openFn, openDelay);
            } else {
                openFn();
            }
        }
    }

    @action close(dropdown) {
        if (this.openTimer) {
            cancel(this.openTimer);
            this.openTimer = null;
        } else {
            let closeFn = () => {
                this.closeTimer = null;
                dropdown.actions.close();
            };
            let closeDelay = this.getDelay('close');
            if (closeDelay) {
                this.closeTimer = later(closeFn, closeDelay);
            } else {
                closeFn();
            }
        }
    }

    @action prevent() {
        return false;
    }

    getDelay(action, defaultDelay = 300) {
        if (this.args[`${action}Delay`]) {
            return this.args[`${action}Delay`];
        }

        if (this.args.delay) {
            return this.args.delay;
        }

        return defaultDelay;
    }
}

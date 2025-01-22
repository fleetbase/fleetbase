import Component from '@glimmer/component';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import calculatePosition from 'ember-basic-dropdown/utils/calculate-position';

export default class LayoutHeaderDropdownComponent extends Component {
    @service media;
    @action onAction(dd, action, ...params) {
        if (typeof dd?.actions?.close === 'function') {
            dd.actions.close();
        }

        if (typeof this.args.onAction === 'function') {
            this.args.onAction(action, ...params);
        }

        if (typeof this.args[action] === 'function') {
            this.args[action](...params);
        }
    }

    /**
     * Calculate dropdown content position.
     *
     * @param {HTMLElement} trigger
     * @param {HTMLElement} content
     * @return {Object}
     * @memberof LayoutHeaderDropdownComponent
     */
    @action calculatePosition(trigger, content) {
        if (this.media.isMobile) {
            content.classList.add('is-mobile');
            const triggerRect = trigger.getBoundingClientRect();
            const top = triggerRect.height + triggerRect.top;

            return { style: { left: '0px', right: '0px', top, padding: '0 0.5rem', width: '100%' } };
        }

        return calculatePosition(...arguments);
    }
}

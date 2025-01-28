import Component from '@glimmer/component';
import { action } from '@ember/object';

export default class MapContainerToolbarComponent extends Component {
    @action calculatePosition(trigger) {
        let { width } = trigger.getBoundingClientRect();

        let style = {
            marginTop: '0px',
            left: `${width + 13}px`,
            top: '0px',
        };

        return { style };
    }

    @action onAction(actionName, ...params) {
        if (typeof this[actionName] === 'function') {
            this[actionName](...params);
        }

        if (typeof this.args[actionName] === 'function') {
            this.args[actionName](...params);
        }
    }

    @action onZoomOut() {
        this.args.map?.zoomOut();
    }

    @action onZoomIn() {
        this.args.map?.zoomIn();
    }
}

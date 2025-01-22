import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action, computed } from '@ember/object';
import { later } from '@ember/runloop';

export default class OverlayHeaderComponent extends Component {
    @tracked overlayPanelHeaderRef;

    @computed('args.title') get useEllipsis() {
        const { title } = this.args;

        return title?.length > 15;
    }

    @computed('args.title') get titleWithElipsis() {
        const { title } = this.args;

        return `${title?.substring(0, 15)}...`;
    }

    @action setupComponent(element) {
        this.overlayPanelHeaderRef = element;
    }

    @action cancel() {
        const { onPressCancel } = this.args;

        const closeOverlay = (callback) => {
            this.overlayPanelHeaderRef?.closest('.next-content-overlay')?.classList.remove('is-open');

            later(
                this,
                () => {
                    if (typeof callback === 'function') {
                        callback();
                    }
                },
                600
            );
        };

        if (typeof onPressCancel === 'function') {
            onPressCancel({ closeOverlay });
        }
    }
}

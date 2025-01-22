import Component from '@glimmer/component';
import { action, computed } from '@ember/object';
import { later } from '@ember/runloop';
import { dasherize } from '@ember/string';

export default class TabsTabComponent extends Component {
    @computed('args.activeTab', 'tabName') get isActive() {
        return this.args.activeTab === this.tabName;
    }

    @computed('args.activeTabClass', 'isActive') get activeTabClass() {
        return this.isActive ? `active ${this.args.activeTabClass}` : '';
    }

    @computed('args.activePaneClass', 'isActive') get activePaneClass() {
        return this.isActive ? `active ${this.args.activePaneClass}` : '';
    }

    @computed('args.title') get tabName() {
        return dasherize(this.args.title);
    }

    constructor() {
        super(...arguments);

        later(
            this,
            () => {
                if (typeof this.args.onCreated === 'function') {
                    this.args.onCreated(this.tabName);
                }
            },
            100
        );
    }

    @action onClick() {
        const { onClick } = this.args;

        if (typeof onClick === 'function') {
            onClick(this.tabName);
        }
    }
}

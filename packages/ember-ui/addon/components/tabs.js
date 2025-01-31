import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import generateUuid from '@fleetbase/ember-core/utils/generate-uuid';

export default class TabsComponent extends Component {
    id = generateUuid();
    @tracked activeTab = null;

    @action onClick(tabName) {
        const { onClick, onTabClick } = this.args;

        this.activeTab = tabName;

        if (typeof onClick === 'function') {
            onClick(tabName);
        }

        if (typeof onTabClick === 'function') {
            onTabClick(tabName);
        }
    }

    @action onCreated(tabName) {
        const { onTabCreated } = this.args;

        if (this.activeTab === null) {
            this.activeTab = tabName;
        }

        if (typeof onTabCreated === 'function') {
            onTabCreated(tabName);
        }
    }
}

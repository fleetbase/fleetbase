import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { later } from '@ember/runloop';

export default class GlobalSearchComponent extends Component {
    @service store;
    @tracked results = [];
    @tracked isLoading;

    @action setupComponent(element) {
        later(
            this,
            () => {
                element.querySelector('input').focus();
            },
            300
        );
    }

    @action search(event) {
        const { target } = event;
        const { value } = target;

        if (!value) {
            this.results = [];
            return;
        }

        this.isLoading = true;

        this.store
            .query('order', { query: value })
            .then((orders) => {
                this.results = orders;
            })
            .finally(() => {
                this.isLoading = false;
            });
    }

    @action onAction(actionName, ...params) {
        if (typeof this[actionName] === 'function') {
            this[actionName](...params);
        }

        if (typeof this.args[actionName] === 'function') {
            this.args[actionName](...params);
        }
    }
}

import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { isArray } from '@ember/array';

const toArray = function (value = []) {
    if (value && typeof value.toArray === 'function') {
        return value.toArray();
    }

    if (isArray(value)) {
        return value;
    }

    return [];
};

export default class PolicyAttacherComponent extends Component {
    @tracked selected = [];
    @tracked lastSelected = null;

    constructor(owner, { value }) {
        super(...arguments);
        this.selected = toArray(value);
    }

    @action selectPolicy(policy) {
        this.lastSelected = null;
        this.selected.pushObject(policy);
        if (typeof this.args.onChange === 'function') {
            this.args.onChange(this.selected);
        }
    }

    @action removePolicy(policy) {
        this.selected.removeObject(policy);
        if (typeof this.args.onChange === 'function') {
            this.args.onChange(this.selected);
        }
    }
}

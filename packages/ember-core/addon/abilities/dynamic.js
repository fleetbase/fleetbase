import { Ability } from 'ember-can';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { singularize } from 'ember-inflector';

export default class extends Ability {
    @service currentUser;
    @tracked service;
    @tracked resource;
    @tracked ability;
    @tracked permissions = new Set();

    constructor() {
        super(...arguments);
        this.permissions = new Set(this.currentUser.permissions.map((permission) => permission.name));
    }

    parseProperty(str) {
        let [service, ability, resource] = str.split(' ');

        this.service = service;
        this.ability = ability;
        this.resource = singularize(resource);

        return 'can';
    }

    get can() {
        if (this.currentUser.isAdmin) {
            return true;
        }

        const permission = [this.service, this.ability, this.resource].join(' ');
        const wilcardPermission = [this.service, '*', this.resource].join(' ');
        const wildcardServicePermission = [this.service, '*'].join(' ');

        return this.permissions.has(permission) || this.permissions.has(wilcardPermission) || this.permissions.has(wildcardServicePermission);
    }
}

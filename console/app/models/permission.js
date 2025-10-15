import Model, { attr } from '@ember-data/model';
import { computed } from '@ember/object';
import { capitalize } from '@ember/string';
import { pluralize } from 'ember-inflector';
import { format, formatDistanceToNow } from 'date-fns';
import humanize from '@fleetbase/ember-core/utils/humanize';

export const parserPermissionName = function (permissionName, index = 0) {
    const parts = permissionName.split(' ');

    if (parts.length >= index + 1) {
        return parts[index];
    }

    return null;
};

export const getPermissionExtension = function (permissionName) {
    return parserPermissionName(permissionName);
};

export const getPermissionAction = function (permissionName) {
    return parserPermissionName(permissionName, 1);
};

export const getPermissionResource = function (permissionName) {
    return parserPermissionName(permissionName, 2);
};

const titleize = function (string = '') {
    if (typeof string !== 'string') {
        return '';
    }
    return humanize(string)
        .split(' ')
        .map((w) => capitalize(w))
        .join(' ');
};

const smartTitleize = function (string = '') {
    if (typeof string !== 'string') {
        return '';
    }

    let titleized = titleize(string);
    if (titleized === 'Iam') {
        titleized = titleized.toUpperCase();
    }

    return titleized;
};

/**
 * Permission model for handling and authorizing actions.
 * permission schema: {extension} {action} {resource}
 * action and resource can be wildcards
 *
 * @export
 * @class PermissionModel
 * @extends {Model}
 */
export default class PermissionModel extends Model {
    /** @attributes */
    @attr('string') name;
    @attr('string') guard_name;
    @attr('string') service;

    /** @dates */
    @attr('date') created_at;
    @attr('date') updated_at;

    /** @methods */
    toJSON() {
        return {
            name: this.name,
            guard_name: this.guard_name,
            service: this.service,
            created_at: this.created_at,
            updated_at: this.updated_at,
        };
    }

    /** @computed */
    @computed('name') get serviceName() {
        return getPermissionExtension(this.name);
    }

    @computed('name') get extensionName() {
        return getPermissionExtension(this.name);
    }

    @computed('name') get actionName() {
        let action = getPermissionAction(this.name);

        if (action === '*') {
            return 'do anything';
        }

        if (action === 'see') {
            return 'Visibly See';
        }

        return titleize(action);
    }

    @computed('name') get resourceName() {
        return getPermissionResource(this.name);
    }

    @computed('actionName', 'name', 'resourceName', 'extensionName') get description() {
        let actionName = this.actionName;
        let actionPreposition = 'to';
        let resourceName = pluralize(smartTitleize(this.resourceName));
        let resourcePreposition = getPermissionAction(this.name) === '*' && resourceName ? 'with' : '';
        let extensionName = smartTitleize(this.extensionName);
        let extensionPreposition = 'on';
        let descriptionParts = ['Permission', actionPreposition, actionName, resourcePreposition, resourceName, extensionPreposition, extensionName];

        return descriptionParts.join(' ');
    }

    @computed('updated_at') get updatedAgo() {
        return formatDistanceToNow(this.updated_at);
    }

    @computed('updated_at') get updatedAt() {
        return format(this.updated_at, 'PPP');
    }

    @computed('created_at') get createdAgo() {
        return formatDistanceToNow(this.created_at);
    }

    @computed('created_at') get createdAt() {
        return format(this.created_at, 'yyyy-MM-dd HH:mm');
    }
}

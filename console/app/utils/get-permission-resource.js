import getPermissionAction from './get-permission-action';
import { classify } from '@ember/string';
import { singularize } from 'ember-inflector';

export default function getPermissionResource(permissionName = '') {
    if (permissionName.startsWith('auth')) {
        return 'N/A';
    }

    const permissionNameParts = permissionName.split(':');
    const fullActionName = permissionNameParts.lastObject;
    const actionName = getPermissionAction(permissionName);
    const resourceName = fullActionName.replace(actionName, '');

    return singularize(classify(resourceName));
}

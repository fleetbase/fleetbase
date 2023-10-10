import { classify } from '@ember/string';

export default function getPermissionAction(permissionName) {
    const permissionNameParts = permissionName.split(':');
    const fullActionName = permissionNameParts.lastObject;
    const actions = [
        'create',
        'update',
        'delete',
        'deactivate',
        'get',
        'list',
        'cancel',
        'optimize',
        'roll',
        'export',
        'batch_delete',
        'batch_cancel',
        'notify',
        'assign_vehicle',
        'assign_order_to',
        'dispatch_order_to',
        'dispatch',
        'assign',
        'attach',
        'sub_contract',
        'create_order_for',
    ];

    if (permissionName.startsWith('auth')) {
        return fullActionName;
    }

    if (fullActionName === '*') {
        return 'All';
    }

    for (let i = 0; i < actions.length; i++) {
        const action = actions.objectAt(i);

        if (fullActionName.toLowerCase().startsWith(classify(action).toLowerCase())) {
            return classify(action);
        }
    }

    return 'N/A';
}

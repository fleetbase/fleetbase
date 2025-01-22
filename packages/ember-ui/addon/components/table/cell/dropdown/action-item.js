import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { isNone } from '@ember/utils';

export default class TableCellDropdownActionItemComponent extends Component {
    @service abilities;
    @tracked permissionRequired;
    @tracked doesntHavePermissions = false;
    @tracked disabled = false;
    @tracked isVisible = true;
    @tracked visible = true;

    constructor(owner, { columnAction = {}, row = {}, disabled = false, permission = null }) {
        super(...arguments);
        this.permissionRequired = columnAction.permission ?? permission;
        this.disabled = this.disabledCheck(columnAction, this.permissionRequired, disabled);
        this.isVisible = this.visibilityCheck(columnAction, row);
        this.visible = columnAction.visible ?? true;
    }

    @action onClick(columnAction, row, dd) {
        if (this.disabled) {
            return;
        }

        if (typeof dd?.actions?.close === 'function') {
            dd.actions.close();
        }

        if (typeof columnAction?.fn === 'function') {
            columnAction.fn(row);
        }
    }

    disabledCheck(columnAction, permission, defaultValue = false) {
        let disabled = columnAction.disabled ?? defaultValue;
        if (!disabled) {
            disabled = permission && this.abilities.cannot(permission);
            this.doesntHavePermissions = disabled;
        }

        return disabled;
    }

    visibilityCheck(columnAction, context) {
        const isVisible = columnAction.isVisible;

        if (isNone(context) || !isVisible) {
            return true;
        }

        if (typeof isVisible === 'boolean') {
            return isVisible;
        }

        if (typeof isVisible === 'function') {
            return isVisible(context);
        }

        return true;
    }
}

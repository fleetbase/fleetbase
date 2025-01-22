import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';

export default class LayoutSidebarPanelComponent extends Component {
    @service abilities;
    @tracked dropdownButtonRenderInPlace = true;
    @tracked permissionRequired = null;
    @tracked disabled = false;
    @tracked doesntHavePermissions = false;
    @tracked visible = true;

    constructor(owner, { dropdownButtonRenderInPlace = true, permission = null, disabled = false, visible = true }) {
        super(...arguments);
        this.dropdownButtonRenderInPlace = dropdownButtonRenderInPlace;
        this.permissionRequired = permission;
        this.disabled = disabled;
        this.visible = visible;
        // If no permissions disable
        if (!disabled) {
            this.disabled = this.doesntHavePermissions = permission && this.abilities.cannot(permission);
        }
    }
}

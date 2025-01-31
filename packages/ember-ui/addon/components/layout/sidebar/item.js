import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { isBlank } from '@ember/utils';
import isMenuItemActive from '../../../utils/is-menu-item-active';
import isEmptyObject from '../../../utils/is-empty-object';

export default class LayoutSidebarItemComponent extends Component {
    @service router;
    @service hostRouter;
    @service abilities;
    @tracked active;
    @tracked dropdownButtonNode;
    @tracked dropdownButtonRenderInPlace = true;
    @tracked permissionRequired = null;
    @tracked disabled = false;
    @tracked doesntHavePermissions = false;
    @tracked visible = true;

    constructor(owner, { dropdownButtonRenderInPlace = true, permission = null, disabled = false, visible = true }) {
        super(...arguments);

        this.active = this.checkIfActive();
        this.dropdownButtonRenderInPlace = dropdownButtonRenderInPlace;
        this.permissionRequired = permission;
        this.disabled = disabled;
        this.visible = visible;
        // If no permissions disable
        if (!disabled) {
            this.disabled = this.doesntHavePermissions = permission && this.abilities.cannot(permission);
        }

        const router = this.getRouter();
        router.on('routeDidChange', this.trackActiveFlag);
    }

    willDestroy() {
        super.willDestroy(...arguments);
        const router = this.getRouter();
        router.off('routeDidChange', this.trackActiveFlag);
    }

    @action trackActiveFlag() {
        this.active = this.checkIfActive();
    }

    @action checkIfActive() {
        const { route, onClick, model } = this.args;
        const item = this.args.item || this.args.menuItem;
        const router = this.getRouter();
        const currentRoute = router.currentRouteName;
        const currentURL = router.currentURL;
        const isInteractive = isBlank(route) && typeof onClick === 'function';
        const isCurrentRoute = typeof route === 'string' && currentRoute.startsWith(route);
        const isCurrentURL = currentURL === window.location.pathname;

        if (isInteractive && !isBlank(item)) {
            return isMenuItemActive(item.section, item.slug, item.view);
        }

        // If model provided use the pathname to determine in addition
        if (model) {
            const routeHasModelParam = router.currentRoute.paramNames.length > 0;
            if (routeHasModelParam) {
                const routeModelParam = router.currentRoute.paramNames[0];
                const routeModelParamValue = model[routeModelParam] ?? '';

                return isCurrentRoute && isCurrentURL && currentURL.includes(routeModelParamValue);
            }

            return isCurrentRoute && isCurrentURL;
        }

        return isCurrentRoute;
    }

    @action onClick(event) {
        if (this.isPointerWithinDropdownButton(event)) {
            event.preventDefault();
            return;
        }

        const doesntHavePermissions = this.permissionRequired && this.abilities.cannot(this.permissionRequired);
        if (doesntHavePermissions) {
            event.preventDefault();
            return;
        }

        const { url, target, route, model, onClick, options = {}, queryParams = {} } = this.args;
        const hasTransitionOptions = !isEmptyObject(options);
        const hasQueryParams = !isEmptyObject(queryParams);
        const modelHasQueryParams = !isEmptyObject(model) && model.queryParams !== undefined;
        const router = this.getRouter();
        const anchor = event.target?.closest('a');

        if (hasQueryParams) {
            options.queryParams = queryParams;
        }

        if (modelHasQueryParams) {
            options.queryParams = model.queryParams;
            delete model.queryParams;
        }

        if (anchor && anchor.attributes?.disabled && anchor.attributes.disabled !== 'disabled="false"') {
            return;
        }

        if (target && url) {
            return window.open(url, target);
        }

        if (url) {
            return (window.location.href = url);
        }

        if (typeof onClick === 'function') {
            return onClick();
        }

        if (hasTransitionOptions && route && model) {
            return router.transitionTo(route, model, options);
        }

        if (hasTransitionOptions && route && !model) {
            return router.transitionTo(route, options);
        }

        if (route && model) {
            return router.transitionTo(route, model);
        }

        if (route) {
            return router.transitionTo(route);
        }
    }

    @action onDropdownItemClick(action, dd) {
        const context = this.getDropdownContext(action);

        if (typeof dd.actions === 'object' && typeof dd.actions.close === 'function') {
            dd.actions.close();
        }

        if (typeof action.fn === 'function') {
            action.fn(context);
        }

        if (typeof action.onClick === 'function') {
            action.onClick(context);
        }
    }

    getDropdownContext(action) {
        let context = null;

        if (action && action.context) {
            context = action.context;
        }

        if (this.args.dropdownContext) {
            context = this.args.dropdownContext;
        }

        return context;
    }

    @action onRegisterAPI() {
        if (typeof this.args.registerAPI === 'function') {
            this.args.registerAPI(...arguments);
        }
    }

    @action onDropdownButtonInsert(dropdownButtonNode) {
        if (dropdownButtonNode) {
            this.dropdownButtonNode = dropdownButtonNode;

            if (typeof this.args.onDropdownButtonInsert === 'function') {
                this.args.onDropdownButtonInsert(...arguments);
            }
        }
    }

    isPointerWithinDropdownButton({ target }) {
        const isTargetDropdownItem = target.classList.contains('next-dd-item');

        if (this.dropdownButtonNode) {
            return this.dropdownButtonNode.contains(target) || isTargetDropdownItem;
        }

        // if dropdown menu item
        if (isTargetDropdownItem) {
            return true;
        }

        return false;
    }

    getRouter() {
        return this.router ?? this.hostRouter;
    }
}

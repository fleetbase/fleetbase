import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';

export default class RegistryYieldComponent extends Component {
    @service universe;
    @tracked yieldables = [];

    constructor() {
        super(...arguments);
        this.yieldables = this.getYieldables();
        this.universe.on('menuItem.registered', () => {
            this.yieldables = this.getYieldables();
        });
        this.universe.on('component.registered', () => {
            this.yieldables = this.getYieldables();
        });
    }

    getYieldables() {
        if (['buttons', 'menu', 'menuItems'].includes(this.args.type)) {
            return this.universe.getMenuItemsFromRegistry(this.args.registry) ?? [];
        }

        return this.universe.getRenderableComponentsFromRegistry(this.args.registry) ?? [];
    }
}

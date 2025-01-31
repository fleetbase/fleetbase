import BaseController from '@fleetbase/fleetops-engine/controllers/base-controller';
import { tracked } from '@glimmer/tracking';
import { action, computed } from '@ember/object';

export default class OperationsOrdersIndexConfigTypesController extends BaseController {
    @tracked configurations = [];
    @tracked isLoaded = false;

    @computed('isLoaded', 'configurations.length') get noConfigsInstalled() {
        return this.configurations.length === 0 && this.isLoaded === true;
    }

    @action setConfigurations(configurations = []) {
        this.configurations = configurations;
        this.isLoaded = true;
    }
}

import Controller from '@ember/controller';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

const PANEL_KEYS = ['total', 'inactive', 'deactivated', 'invitations'];

export default class ConsoleBitacoraMockReportController extends Controller {
    @tracked selectedPanel = 'total';

    get panelKeys() {
        return PANEL_KEYS;
    }

    get selectedPanelLabel() {
        const stat = this.model?.stats?.find((entry) => entry.key === this.selectedPanel);
        return stat?.label ?? '';
    }

    isStatSelected(statKey) {
        return statKey === this.selectedPanel;
    }

    @action
    selectPanel(key) {
        this.selectedPanel = key;
    }
}


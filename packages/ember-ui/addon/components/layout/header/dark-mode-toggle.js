import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { action, computed } from '@ember/object';

export default class LayoutHeaderDarkModeToggleComponent extends Component {
    @service theme;

    @computed('theme.currentTheme') get userPrefersDarkMode() {
        return this.theme.currentTheme === 'dark';
    }

    @action switchDarkMode(darkModeOn) {
        this.theme.setTheme(darkModeOn ? 'dark' : 'light');
    }
}

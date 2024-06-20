import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { isArray } from '@ember/array';
import { getOwner } from '@ember/application';
import { task, timeout } from 'ember-concurrency';
import loadExtensions from '@fleetbase/ember-core/utils/load-extensions';

export default class ExtensionInjectorComponent extends Component {
    @service fetch;
    @service notifications;
    @service universe;
    @tracked engines = [];
    @tracked packages = [];

    constructor () {
        super(...arguments);
        this.loadInstalledEngines.perform();
    }

    @task *loadInstalledEngines () {
        yield timeout(300);

        try {
            const engines = yield this.fetch.get('load-installed-engines', {}, { namespace: '~registry/v1' });
            if (isArray(engines)) {
                engines.forEach(extensionId => {
                    this.loadExtensionFromManifest.perform(extensionId);
                });
            }
        } catch (error) {
            this.notifications.serverError(error);
        }
    }

    @task *loadExtensionFromManifest (extensionId) {
        try {
            const assets = yield this.fetch.get(`load-engine-manifest/${extensionId}`, {}, { namespace: '~registry/v1' });
            if (isArray(assets)) {
                assets.forEach(asset => {
                    this.inject(asset);
                });
            }
        } catch (error) {
            this.notifications.serverError(error);
        }

        this.initializeExtensions();
    }

    initializeExtensions () {
        const owner = getOwner(this);

        this.packages.forEach(packageJson => {
            this.universe.loadEngine(packageJson.name).then(engineInstance => {
                if (engineInstance.base && engineInstance.base.setupExtension) {
                    engineInstance.base.setupExtension(owner, engineInstance, this.universe);
                }
            });
        });
    }

    inject ({ type, content }) {
        switch (type) {
            case 'package':
                this.packages.pushObject(content);
                return;
            case 'css':
                return this.injectStylesheet(content);
            case 'js':
            default:
                return this.injectScript(content);
        }
    }

    injectScript (content) {
        const script = document.createElement('script');
        script.type = 'application/javascript';
        script.text = content;
        document.head.appendChild(script);
    }

    injectStylesheet (content) {
        const style = document.createElement('style');
        style.type = 'text/css';
        if (style.styleSheet) {
            // This is required for IE8 and below.
            style.styleSheet.cssText = content;
        } else {
            // For most browsers
            style.appendChild(document.createTextNode(content));
        }
        document.head.appendChild(style);
    }
}

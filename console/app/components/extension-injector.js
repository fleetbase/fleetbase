import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { isArray } from '@ember/array';
import { getOwner } from '@ember/application';
import { later } from '@ember/runloop';
import { task, timeout } from 'ember-concurrency';
import { injectAsset } from '../utils/asset-injector';
import getMountedEngineRoutePrefix from '@fleetbase/ember-core/utils/get-mounted-engine-route-prefix';

function removeTrailingDot (str) {
    if (str.endsWith('.')) {
        return str.slice(0, -1);
    }
    return str;
}

window.exports = window.exports ?? {};
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
            for (const id in engines) {
                yield this.loadAndMountEngine.perform(id, engines[id]);
            }
        } catch (error) {
            this.notifications.serverError(error);
        }
    }

    @task *loadAndMountEngine (id, enginePackage) {
        const engineName = enginePackage.name;
        const assets = yield this.fetch.get(`load-engine-manifest/${id}`, {}, { namespace: '~registry/v1' });

        if (isArray(assets)) {
            for (const i in assets) {
                injectAsset(assets[i]);
            }
        }

        yield timeout(300);
        this.registerEngine(enginePackage);
    }

    registerEngine (enginePackage) {
        const engineName = enginePackage.name;
        const owner = getOwner(this);
        const router = getOwner(this).lookup('router:main');

        if (this.hasAssetManifest(engineName)) {
            return this.universe.loadEngine(engineName).then(engineInstance => {
                if (engineInstance.base && engineInstance.base.setupExtension) {
                    engineInstance.base.setupExtension(owner, engineInstance, this.universe);
                }
            });
        }

        try {
            if (router._engineIsLoaded(engineName)) {
                router._registerEngine(engineName);

                const instanceId = Object.values(router._engineInstances).length;
                const mountPoint = removeTrailingDot(getMountedEngineRoutePrefix(engineName.replace('@fleetbase/', ''), enginePackage.fleetbase));
                this.universe.constructEngineInstance(engineName, instanceId, mountPoint).then(engineInstance => {
                    if (engineInstance) {
                        this.setupEngine(owner, engineInstance, enginePackage);
                        this.setEnginePromise(engineName, engineInstance);
                        this.addEngineRoutesToRouter(engineName, engineInstance, instanceId, mountPoint, router);
                        this.addEngineRoutesToRecognizer(engineName, router);
                        this.resolveEngineRegistrations(engineInstance);

                        console.log(engineInstance, router, owner);
                        if (engineInstance.base && engineInstance.base.setupExtension) {
                            engineInstance.base.setupExtension(owner, engineInstance, this.universe);
                        }
                    }
                });
            }
        } catch (error) {
            console.trace(error);
        }
    }

    setupEngine (appInstance, engineInstance, enginePackage) {
        const engineName = enginePackage.name;
        appInstance.application.engines[engineName] = engineInstance.dependencies ?? { externalRoutes: {}, services: {} };
        appInstance._dependenciesForChildEngines[engineName] = engineInstance.dependencies ?? { externalRoutes: {}, services: {} };
        if (isArray(appInstance.application.extensions)) {
            appInstance.application.extensions.push(enginePackage);
        }
    }

    addEngineRoutesToRecognizer (engineName, router) {
        const recognizer = router._routerMicrolib.recognizer || router._router._routerMicrolib.recognizer;
        if (recognizer) {
            let routeName = `${engineName}.application`;

            recognizer.add(
                [
                    {
                        path: 'console.fleet-ops',
                        handler: 'console.fleet-ops',
                    },
                ],
                { as: 'console.fleet-ops' }
            );
        }
    }

    addEngineRoutesToRouter (engineName, engineInstance, instanceId, mountPoint, router) {
        const getRouteInfo = routeName => {
            const applicationRoute = routeName.replace(mountPoint, '') === '';
            return {
                fullName: mountPoint,
                instanceId,
                localFullName: applicationRoute ? 'application' : routeName.replace(`${mountPoint}.`, ''),
                mountPoint,
                name: engineName,
            };
        };

        const routes = ['console.fleet-ops', 'console.fleet-ops.home'];
        for (let i = 0; i < routes.length; i++) {
            const routeName = routes[i];
            router._engineInfoByRoute[routeName] = getRouteInfo(routeName);
        }

        // Reinitialize or refresh the router
        router.setupRouter();
    }

    setEnginePromise (engineName, engineInstance) {
        const router = getOwner(this).lookup('router:main');
        if (router) {
            router._enginePromises[engineName] = { manual: engineInstance._bootPromise };
        }
    }

    resolveEngineRegistrations (engineInstance) {
        const owner = getOwner(this);
        const registry = engineInstance.__registry__;
        const registrations = registry.registrations;
        const getOwnerSymbol = obj => {
            const symbols = Object.getOwnPropertySymbols(obj);
            const ownerSymbol = symbols.find(symbol => symbol.toString() === 'Symbol(OWNER)');
            return ownerSymbol;
        };
        for (let registrationKey in registrations) {
            const registrationInstance = registrations[registrationKey];
            if (typeof registrationInstance === 'string') {
                // Try to resolve from owner
                let resolvedRegistrationInstance = owner.lookup(registrationKey);
                // Hack for host-router
                if (registrationKey === 'service:host-router') {
                    resolvedRegistrationInstance = owner.lookup('service:router');
                }
                if (resolvedRegistrationInstance) {
                    // Correct the owner
                    resolvedRegistrationInstance[getOwnerSymbol(resolvedRegistrationInstance)] = engineInstance;
                    // Resolve
                    registrations[registrationKey] = resolvedRegistrationInstance;
                }
            }
        }
    }

    hasAssetManifest (engineName) {
        const router = getOwner(this).lookup('router:main');
        if (router._assetLoader) {
            const manifest = router._assetLoader.getManifest();
            if (manifest && manifest.bundles) {
                return manifest.bundles[engineName] !== undefined;
            }
        }

        return false;
    }
}

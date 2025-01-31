import { dasherize } from '@ember/string';
import hostServices from '../exports/host-services';

export default async function loadEngines(appInstance, withServices = []) {
    return new Promise((resolve, reject) => {
        return fetch('extensions.json')
            .then((resp) => resp.json())
            .then((extensions) => {
                const engines = {};
                const externalRoutes = {
                    console: 'console.home',
                    extensions: 'console.extensions',
                };

                for (let i = 0; i < extensions.length; i++) {
                    const extension = extensions[i];
                    const path = dasherize(extension.extension);

                    externalRoutes[path] = `console.${path}`;
                }

                for (let i = 0; i < extensions.length; i++) {
                    const extension = extensions[i];

                    engines[extension.name] = {
                        dependencies: {
                            services: [...hostServices, ...withServices],
                            externalRoutes,
                        },
                    };
                }

                resolve(engines);
            })
            .catch(reject);
    });
}

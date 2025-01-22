import consoleUrl from './console-url';
import config from '@fleetbase/console/config/environment';
import { get } from '@ember/object';

export default function apiUrl(path, queryParams = {}, subdomain = null, host = null) {
    if (host === null) {
        host = `${get(config, 'API.host')}/${get(config, 'API.namespace')}`;
    }

    return consoleUrl(path, queryParams, subdomain, host);
}

import config from '@fleetbase/console/config/environment';
import { isBlank } from '@ember/utils';

const isDevelopment = ['local', 'development'].includes(config.environment);

export function queryString(params) {
    return Object.keys(params)
        .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
        .join('&');
}

export function extractHostAndPort(url) {
    try {
        const { hostname: host, port = null } = new URL(url);
        return { host, port };
    } catch (error) {
        return { host: null, port: null };
    }
}

export default function consoleUrl(path = '', queryParams = {}, subdomain = null, host = null) {
    if (subdomain === null || host === null) {
        const { hostname, host: currentHost } = window.location;
        if (subdomain === null) {
            const parts = hostname.split('.');
            subdomain = parts.length > 2 ? parts[0] : null;
        }
        if (host === null) {
            host = currentHost;
        }
    }

    const { host: parsedHost, port } = extractHostAndPort(host);
    const protocol = isDevelopment ? 'http://' : 'https://';
    const urlParams = !isBlank(queryParams) ? queryString(queryParams) : '';
    const portSegment = port ? `:${port}` : '';
    const pathSegment = path.startsWith('/') ? path : `/${path}`;

    return `${protocol}${subdomain ? subdomain + '.' : ''}${parsedHost}${portSegment}${pathSegment}${urlParams ? '?' + urlParams : ''}`;
}

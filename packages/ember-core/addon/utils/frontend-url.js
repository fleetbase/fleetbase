import config from '@fleetbase/console/config/environment';
import { isBlank } from '@ember/utils';

const queryString = (params) =>
    Object.keys(params)
        .map((key) => `${key}=${params[key]}`)
        .join('&');

export default function frontendUrl(path = '', queryParams = {}) {
    let url = 'https://';
    let urlParams = !isBlank(queryParams) ? queryString(queryParams) : '';

    if (['qa', 'staging'].includes(config.environment)) {
        url += `${config.environment}.`;
    }

    if (['local', 'development'].includes(config.environment)) {
        url += 'fleetbase.dev';
    } else {
        url += 'fleetbase.io';
    }

    url += `/${path}`;

    if (urlParams) {
        url += `?${urlParams}`;
    }

    return url;
}

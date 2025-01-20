import { helper } from '@ember/component/helper';

export default helper(function avatarUrl([url, defaultUrl = 'https://s3.ap-southeast-1.amazonaws.com/flb-assets/static/no-avatar.png']) {
    if (typeof url === 'string') {
        return url;
    }

    return defaultUrl;
});

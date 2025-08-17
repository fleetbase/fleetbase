import { helper } from '@ember/component/helper';
import { get } from '@ember/object';
import config from '@fleetbase/console/config/environment';

export default helper(function configHelper([key]) {
    return get(config, key);
});

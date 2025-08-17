import { helper } from '@ember/component/helper';
import config from '@fleetbase/console/config/environment';

export default helper(function appName() {
    return config.APP.name || 'Hashmicro TMS';
});

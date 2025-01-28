import { helper } from '@ember/component/helper';
import getServiceName from '@fleetbase/utils/get-service-name';

export default helper(function serviceName([name]) {
    return getServiceName(name);
});

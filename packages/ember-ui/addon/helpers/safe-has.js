import { helper } from '@ember/component/helper';
import { get } from '@ember/object';

export default helper(function safeHas([obj, path]) {
    if (obj && !obj.isDestroyed && !obj.isDestroying) {
        return get(obj, path);
    } else {
        return undefined;
    }
});

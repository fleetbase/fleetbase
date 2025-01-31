import { helper } from '@ember/component/helper';
import { get } from '@ember/object';
import environment from 'ember-get-config';

export default helper(function config([key]) {
    return get(environment, key);
});

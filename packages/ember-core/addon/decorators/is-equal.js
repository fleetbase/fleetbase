import { computed } from '@ember/object';
import { decoratorWithRequiredParams } from '@ember-decorators/utils/decorator';
import { assert } from '@ember/debug';

export function isEqual(propNameA, propNameB) {
    return decoratorWithRequiredParams(function (target, desc, key, params) {
        assert(`The @isEqual decorator requires two property names as parameters`, params.length === 2);

        let [a, b] = params;

        return computed(a, b, function () {
            return this.get(a) === this.get(b);
        });
    }, 'isEqual')(propNameA, propNameB);
}

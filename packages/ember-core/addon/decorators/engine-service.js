import { decoratorWithRequiredParams } from '@ember-decorators/utils/decorator';
import { computed } from '@ember/object';
import { assert } from '@ember/debug';
import injectEngineService from '../utils/inject-engine-service';
import isObject from '../utils/is-object';

export default decoratorWithRequiredParams(function (target, key, descriptor, [engineName, options = {}]) {
    assert('The first argument of the @engineService decorator must be a string', typeof engineName === 'string');
    assert('The second argument of the @engineService decorator must be an object', isObject(options));

    const { initializer } = descriptor;
    delete descriptor.initializer;

    const cp = computed(`_engineService_${key}`, function () {
        const service = injectEngineService(this, engineName, key, options);

        if (initializer) {
            return initializer.call(this);
        }

        return service;
    });

    return cp(target, key, descriptor);
});

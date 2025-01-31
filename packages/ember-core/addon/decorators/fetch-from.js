import { decoratorWithRequiredParams } from '@ember-decorators/utils/decorator';
import { getOwner } from '@ember/application';
import { assert } from '@ember/debug';

export default decoratorWithRequiredParams(function (target, key, descriptor, [endpoint, query = {}, options = {}]) {
    assert('The first argument of the @fetchFrom decorator must be a string', typeof endpoint === 'string');
    assert('The second argument of the @fetchFrom decorator must be an object', typeof query === 'object');
    assert('The third argument of the @fetchFrom decorator must be an object', typeof options === 'object');

    // Remove value and writable if previously set, use getter instead
    delete descriptor.value;
    delete descriptor.writable;
    delete descriptor.initializer;

    // Create symbol to track value
    const symbol = Symbol(`__${key}_fetchFrom`);

    // Setter to get symbol value
    descriptor.set = function (value) {
        this[symbol] = value;
    };

    // Get or set symbol value
    descriptor.get = async function () {
        if (this[symbol] !== undefined) {
            return this[symbol];
        }

        Object.defineProperty(this, symbol, {
            configurable: true,
            enumerable: false,
            writable: true,
            value: null,
        });

        const owner = getOwner(this);
        const fetch = owner.lookup('service:fetch');
        return fetch
            .get(endpoint, query, options)
            .then((response) => {
                this.set(key, response);
                if (options && typeof options.onComplete === 'function') {
                    options.onComplete(response, this);
                }
            })
            .catch(() => {
                this.set(key, null);
            });
    };

    return descriptor;
});

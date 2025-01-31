import { decoratorWithRequiredParams } from '@ember-decorators/utils/decorator';
import { assert } from '@ember/debug';
import { getOwner } from '@ember/application';
import { scheduleOnce } from '@ember/runloop';

export default function fetchFrom(endpoint, query = {}, options = {}) {
    assert('The first argument of the @fetchFrom decorator must be a string', typeof endpoint === 'string');
    assert('The second argument of the @fetchFrom decorator must be an object', typeof query === 'object');
    assert('The third argument of the @fetchFrom decorator must be an object', typeof options === 'object');

    return decoratorWithRequiredParams(function (target, key) {
        const symbol = Symbol(`__${key}_fetchFrom`);

        Object.defineProperty(target, symbol, {
            configurable: true,
            enumerable: false,
            writable: true,
            value: null,
        });

        Object.defineProperty(target, key, {
            configurable: true,
            enumerable: true,
            get() {
                return this[symbol];
            },
            set(value) {
                this[symbol] = value;
            },
        });

        const originalInit = target.init;

        target.init = function () {
            if (originalInit) {
                originalInit.call(this);
            }

            scheduleOnce('afterRender', this, function () {
                const owner = getOwner(this);
                const fetch = owner.lookup('service:fetch'); // Get the Fleetbase Fetch service

                // Perform the query and set the result to the property
                fetch
                    .get(endpoint, query, options)
                    .then((result) => {
                        this.set(key, result);
                    })
                    .catch(() => {
                        this.set(key, []);
                    });
            });
        };
    }, 'fetchFrom')(endpoint, query, options);
}

import Helper from '@ember/component/helper';
import { assert } from '@ember/debug';
import { DEBUG } from '@glimmer/env';

const HAS_NATIVE_PROXY = typeof Proxy === 'function';
const INVOKE = 'invoke';

const isDropdownActions = function (dd) {
    return Object.keys(dd).includes('uniqueId', 'isOpen', 'disabled', 'actions', 'Trigger', 'Content');
};

const context = (function buildUntouchableThis() {
    let context = null;

    if (DEBUG && HAS_NATIVE_PROXY) {
        let assertOnProperty = (property) => {
            assert(
                `You accessed \`this.${String(
                    property
                )}\` from a function passed to the \`fn\` helper, but the function itself was not bound to a valid \`this\` context. Consider updating to usage of \`@action\`.`
            );
        };

        context = new Proxy(
            {},
            {
                get(_target, property) {
                    assertOnProperty(property);
                },

                set(_target, property) {
                    assertOnProperty(property);

                    return false;
                },

                has(_target, property) {
                    assertOnProperty(property);

                    return false;
                },
            }
        );
    }

    return context;
})();

export default Helper.extend({
    init() {
        this._super();

        this._dd = null;
        this._positional = null;
        this._fn = null;
    },

    compute(positional) {
        assert(`You must pass a DropdownActions instance as the \`dropdown-fn\` helpers first argument, check the yield of the Dropdown component`, isDropdownActions(positional[0]));
        assert(`You must pass a function as the \`dropdown-fn\` helpers second argument, you passed ${positional[1]}`, typeof positional[1] === 'function');

        this._dd = positional[0];
        this._positional = positional;

        if (this._fn === null) {
            this._fn = (...invocationArgs) => {
                let [, fn, ...args] = this._positional;

                if (typeof fn[INVOKE] === 'function') {
                    // references with the INVOKE symbol expect the function behind
                    // the symbol to be bound to the reference
                    return fn[INVOKE](...args, ...invocationArgs);
                } else {
                    return fn.call(context, ...args, ...invocationArgs);
                }
            };
        }

        return () => {
            let [, , ...args] = this._positional;

            if (typeof this._dd?.actions?.close === 'function') {
                this._dd.actions.close();
            }

            this._fn(...args);
        };
    },
});

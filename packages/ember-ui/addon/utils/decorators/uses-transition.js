import isFastBoot from '../is-fastboot';
import { assert } from '@ember/debug';

export default function arg(fadeProperty) {
    assert('You have to provide a fadeProperty for typeClass', typeof fadeProperty === 'string');

    return function () {
        return {
            get() {
                return !isFastBoot(this) && this.args[fadeProperty] !== false;
            },
        };
    };
}

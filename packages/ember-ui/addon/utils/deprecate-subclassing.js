import { DEBUG } from '@glimmer/env';
import { deprecate } from '@ember/debug';
import { next } from '@ember/runloop';

export default function deprecateSubclassing(target) {
    if (DEBUG) {
        const wrapperClass = class extends target {
            constructor() {
                super(...arguments);
                // we need to delay the deprecation check, as the __ember-bootstrap_subclass class field will only be set *after* the constructor
                next(() => {
                    deprecate(
                        `Extending from ember-bootstrap component classes is not supported, and might break anytime. Detected subclassing of <Bs${target.name}> component.`,
                        // the `__ember-bootstrap_subclass` flag is an escape hatch for "privileged" addons like validations addons that currently still have to rely on subclassing
                        wrapperClass === this.constructor || this['__ember-bootstrap_subclass'] === true,
                        {
                            id: `ember-bootstrap.subclassing#${target.name}`,
                            until: '5.0.0',
                            since: '4.0.0',
                            for: 'ember-bootstrap',
                        }
                    );
                });
            }
        };

        return wrapperClass;
    }
}

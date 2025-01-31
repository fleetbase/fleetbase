import defineModifier from 'ember-concurrency-test-waiter/define-modifier';

export function initialize() {
    defineModifier();
}

export default {
    initialize,
};

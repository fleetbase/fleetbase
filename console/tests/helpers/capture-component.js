/**
 * Hands a test the live instance of a Glimmer component.
 *
 * Glimmer components cannot be constructed by hand: the debug build checks the `args`
 * object against an internal WeakSet, so `new MyComponent(owner, {})` throws "You must pass
 * both the owner and args to super()". The supported way to reach an instance is to let
 * Ember build it, so this registers a capturing subclass under the component's own name.
 * The subclass adds nothing but a constructor hook — the real class still supplies every
 * method under test, and its template comes along because getComponentTemplate() walks the
 * prototype chain.
 *
 * Register before rendering, then read `.instance` afterwards:
 *
 *     const captured = captureComponent(this.owner, 'configure/queue', ConfigureQueueComponent);
 *     await render(hbs`<Configure::Queue />`);
 *     captured.instance.setDriver('sqs');
 *
 * @param {Owner} owner The test container owner
 * @param {String} name The component name as registered, e.g. 'configure/queue'
 * @param {Class} ComponentClass The real component class to instantiate
 * @return {{ instance: Object|null }} A box whose `instance` is filled in on render
 */
export function captureComponent(owner, name, ComponentClass) {
    const captured = { instance: null };

    class CapturingComponent extends ComponentClass {
        constructor() {
            super(...arguments);
            captured.instance = this;
        }
    }

    owner.register(`component:${name}`, CapturingComponent);

    return captured;
}

export default captureComponent;

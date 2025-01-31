export default function contextComponentCallback(component, name, ...params) {
    let callbackInvoked = false;

    if (typeof component.args[name] === 'function') {
        component.args[name](...params);
        callbackInvoked = true;
    }

    // now do for context options
    if (typeof component.args.options === 'object' && typeof component.args.options[name] === 'function') {
        component.args.options[name](...params);
        callbackInvoked = true;
    }

    return callbackInvoked;
}

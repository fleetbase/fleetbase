import { getOwner } from '@ember/application';
import { isArray } from '@ember/array';
import Service from '@ember/service';
import isObject from './is-object';

function findService(owner, target, serviceName) {
    let service = target[serviceName];
    if (!(service instanceof Service)) {
        service = owner.lookup(`service:${serviceName}`);
    }

    return service;
}

function injectServices(service, target, owner, injections) {
    if (isArray(injections)) {
        for (let i = 0; i < injections.length; i++) {
            const serviceName = injections[i];
            service[serviceName] = findService(owner, target, serviceName);
        }
    } else if (isObject(injections)) {
        for (let serviceName in injections) {
            service[serviceName] = injections[serviceName] ?? findService(owner, target, serviceName);
        }
    }
}

// unresolved services value will be the key as a string
function automaticServiceResolution(service, target, owner) {
    for (let prop in service) {
        if (typeof prop === 'string' && typeof service[prop] === 'string' && prop === service[prop]) {
            service[prop] = findService(owner, target, prop);
        }
    }
}

function _getOwner(target) {
    return window.Fleetbase ?? getOwner(target);
}

export default function injectEngineService(target, engineName, serviceName, options = {}) {
    const owner = _getOwner(target);
    const universe = owner.lookup('service:universe');
    const service = universe.getServiceFromEngine(engineName, serviceName);
    const key = options.key || null;
    const effectiveServiceName = key || serviceName;
    if (options && options.inject) {
        injectServices(service, target, owner, options.inject);
    } else {
        automaticServiceResolution(service, target, owner);
    }

    Object.defineProperty(target, effectiveServiceName, {
        value: service,
        writable: false,
        configurable: true,
        enumerable: true,
    });

    return service;
}

import ObjectProxy from '@ember/object/proxy';

export default function isProxy(subject) {
    return subject instanceof ObjectProxy;
}

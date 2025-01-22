import Model from '@ember-data/model';
import ObjectProxy from '@ember/object/proxy';

export default function isModel(mixed) {
    return mixed instanceof Model || mixed instanceof ObjectProxy;
}

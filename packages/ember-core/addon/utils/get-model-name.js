import { get } from '@ember/object';
import { isArray } from '@ember/array';
import { isBlank } from '@ember/utils';
import { w, capitalize } from '@ember/string';
import isModel from './is-model';
import humanize from './humanize';

export default function getModelName(model, fallback = null, options = {}) {
    let modelName;

    if (isArray(fallback)) {
        for (let i = 0; i < fallback.length; i++) {
            const defaultValue = fallback.objectAt(i);

            if (!isBlank(defaultValue)) {
                modelName = defaultValue;
                break;
            }
        }
    } else {
        modelName = fallback;
    }

    if (isModel(model)) {
        modelName = get(model, 'constructor.modelName') ?? get(model, '_internalModel.modelName') ?? fallback;
    }

    if (options.humanize === true) {
        modelName = humanize(modelName);
    }

    if (options.lowercase === true) {
        modelName = modelName.toLowerCase();
    }

    if (options.capitalize === true) {
        modelName = capitalize(modelName);
    }

    if (options.capitalizeWords === true) {
        modelName = w(modelName).map(capitalize).join(' ');
    }

    return modelName;
}

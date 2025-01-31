import { isBlank } from '@ember/utils';

export default function relationIsLoaded(model, relationship) {
    return !isBlank(model[relationship]);
}

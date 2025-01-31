import { isBlank } from '@ember/utils';
import { underscore } from '@ember/string';

export default function shouldNotLoadRelation(model, relationship, relationshipId = null) {
    relationshipId = relationshipId === null ? `${underscore(relationship)}_uuid` : relationshipId;
    return isBlank(model[relationshipId]) || !isBlank(model[relationship]);
}

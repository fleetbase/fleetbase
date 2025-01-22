import Service from 'ember-can/services/abilities';

export default class AbilitiesService extends Service {
    parse(propertyName) {
        return { propertyName, abilityName: 'dynamic' };
    }
}

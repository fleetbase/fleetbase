import Resolver from 'ember-resolver';

export default class extends Resolver {
    resolveRoute(parsedName) {
        if (parsedName.fullNameWithoutType === 'main') {
            return import('./router.generated');
        }

        return super.resolveRoute(parsedName);
    }
}

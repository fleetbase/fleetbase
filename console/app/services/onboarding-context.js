import Service, { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';

export default class OnboardingContextService extends Service {
    @service appCache;
    @tracked data = {};

    get(key) {
        return this.data[key] ?? this.appCache.get(`onboarding:context:${key}`);
    }

    getFromCache(key) {
        return this.appCache.get(`onboarding:context:${key}`);
    }

    set(key, value, options = {}) {
        this.data = { ...this.data, [key]: value };
        if (options?.persist === true) {
            this.appCache.set(`onboarding:context:${key}`, value);
        }
    }

    persist(key, value) {
        this.set(key, value, { persist: true });
    }

    del(key) {
        const { [key]: _drop, ...rest } = this.data; // eslint-disable-line no-unused-vars
        this.data = rest;
        this.appCache.set(`onboarding:context:${key}`, undefined);
    }

    reset() {
        for (let key in this.data) {
            this.appCache.set(`onboarding:context:${key}`, undefined);
        }
        this.data = {};
    }
}

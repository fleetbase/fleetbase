import Service from '@ember/service';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { isArray } from '@ember/array';
import { dasherize } from '@ember/string';
import { storageFor } from 'ember-local-storage';
import autoSerialize from '../utils/auto-serialize';

export default class AppCacheService extends Service {
    @service currentUser;
    @service store;
    @storageFor('local-cache') localCache;

    get cachePrefix() {
        const userId = this.currentUser.id ?? 'anon';
        return `${userId}:${this.currentUser.companyId}:`;
    }

    @action setEmberData(key, value, except = []) {
        value = autoSerialize(value, except);

        return this.set(key, value);
    }

    @action getEmberData(key, modelName) {
        const data = this.get(key);

        if (isArray(data)) {
            return data.map((instance) => this.store.push(this.store.normalize(modelName, instance)));
        }

        return this.store.push(this.store.normalize(modelName, data));
    }

    @action set(key, value) {
        this.localCache.set(`${this.cachePrefix}${dasherize(key)}`, value);

        return this;
    }

    @action get(key, defaultValue = null) {
        const value = this.localCache.get(`${this.cachePrefix}${dasherize(key)}`);
        if (value === undefined) {
            return defaultValue;
        }
        return value;
    }

    @action has(key) {
        if (isArray(key)) {
            return key.every((k) => this.get(k) !== undefined);
        }

        return this.get(key) !== undefined;
    }

    @action doesntHave(key) {
        if (isArray(key)) {
            return key.every((k) => this.get(k) === undefined);
        }

        return this.get(key) === undefined;
    }
}

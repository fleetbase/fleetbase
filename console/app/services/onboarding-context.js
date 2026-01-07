import Service, { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';

const CONTEXT_PREFIX = 'onboarding:context:';
const KEYS_INDEX = `${CONTEXT_PREFIX}__keys__`;

export default class OnboardingContextService extends Service {
    @service appCache;
    @tracked data = {};

    /**
     * Get a value from in-memory state first, then fallback to cache
     */
    get(key) {
        return this.data[key] ?? this.appCache.get(`${CONTEXT_PREFIX}${key}`);
    }

    /**
     * Get a value directly from cache
     */
    getFromCache(key) {
        return this.appCache.get(`${CONTEXT_PREFIX}${key}`);
    }

    /**
     * Restore all persisted onboarding context values from cache
     *
     * @returns {Object}
     */
    restore() {
        const keys = this.appCache.get(KEYS_INDEX) ?? [];
        const persisted = {};

        for (const key of keys) {
            const value = this.appCache.get(`${CONTEXT_PREFIX}${key}`);
            if (value !== undefined) {
                persisted[key] = value;
            }
        }

        return persisted;
    }

    /**
     * Merge data into the context
     * Optionally persist all merged values
     */
    merge(data = {}, options = {}) {
        if (!data || typeof data !== 'object') {
            return;
        }

        this.data = { ...this.data, ...data };

        if (options.persist === true) {
            const keys = new Set(this.appCache.get(KEYS_INDEX) ?? []);

            for (const key of Object.keys(data)) {
                keys.add(key);
                this.appCache.set(`${CONTEXT_PREFIX}${key}`, this.data[key]);
            }

            this.appCache.set(KEYS_INDEX, [...keys]);
        }
    }

    /**
     * Set a single value
     * Optionally persist it
     */
    set(key, value, options = {}) {
        this.data = { ...this.data, [key]: value };

        if (options.persist === true) {
            const keys = new Set(this.appCache.get(KEYS_INDEX) ?? []);
            keys.add(key);

            this.appCache.set(`${CONTEXT_PREFIX}${key}`, value);
            this.appCache.set(KEYS_INDEX, [...keys]);
        }
    }

    /**
     * Convenience alias for persisted set
     */
    persist(key, value) {
        this.set(key, value, { persist: true });
    }

    /**
     * Delete a key from memory and cache
     */
    del(key) {
        const { [key]: _removed, ...rest } = this.data; // eslint-disable-line no-unused-vars
        this.data = rest;

        const keys = new Set(this.appCache.get(KEYS_INDEX) ?? []);
        keys.delete(key);

        this.appCache.set(`${CONTEXT_PREFIX}${key}`, undefined);
        this.appCache.set(KEYS_INDEX, [...keys]);
    }

    /**
     * Fully reset onboarding context (memory + persistence)
     */
    reset() {
        const keys = this.appCache.get(KEYS_INDEX) ?? [];

        for (const key of keys) {
            this.appCache.set(`${CONTEXT_PREFIX}${key}`, undefined);
        }

        this.appCache.set(KEYS_INDEX, []);
        this.data = {};
    }
}
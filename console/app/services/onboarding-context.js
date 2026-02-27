import Service, { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';

const CONTEXT_PREFIX = 'onboarding:context:';
const KEYS_INDEX = `${CONTEXT_PREFIX}__keys__`;

export default class OnboardingContextService extends Service {
    @service appCache;
    @service notifications;
    @tracked data = {};
    @tracked quotaExceeded = false;
    @tracked usingMemoryFallback = false;

    // In-memory fallback storage for when localStorage is full
    _memoryCache = new Map();

    /**
     * Safe wrapper for appCache.set with quota error handling
     * 
     * @param {string} key - The key to set
     * @param {*} value - The value to store
     * @returns {Object} Result object with success status and storage type
     */
    _safeSet(key, value) {
        try {
            this.appCache.set(key, value);
            return { success: true, storage: 'localStorage' };
        } catch (error) {
            if (this._isQuotaError(error)) {
                console.warn(`[OnboardingContext] localStorage quota exceeded, using memory fallback for key: ${key}`);
                
                // Store in memory as fallback
                this._memoryCache.set(key, value);
                
                // Mark that we're using fallback and notify user (only once)
                if (!this.quotaExceeded) {
                    this.quotaExceeded = true;
                    this.usingMemoryFallback = true;
                    this._notifyUser();
                }
                
                return { success: true, storage: 'memory', warning: 'Using memory fallback' };
            }
            
            // Re-throw non-quota errors
            throw error;
        }
    }

    /**
     * Safe wrapper for appCache.get with memory fallback
     * 
     * @param {string} key - The key to retrieve
     * @returns {*} The stored value or undefined
     */
    _safeGet(key) {
        try {
            const value = this.appCache.get(key);
            if (value !== undefined) {
                return value;
            }
        } catch (error) {
            console.warn(`[OnboardingContext] Error reading from appCache: ${error.message}`);
        }
        
        // Fallback to memory cache
        return this._memoryCache.get(key);
    }

    /**
     * Check if error is a quota exceeded error
     * 
     * @param {Error} error - The error to check
     * @returns {boolean} True if it's a quota error
     */
    _isQuotaError(error) {
        return (
            error instanceof DOMException &&
            (error.code === 22 ||
                error.code === 1014 ||
                error.name === 'QuotaExceededError' ||
                error.name === 'NS_ERROR_DOM_QUOTA_REACHED')
        );
    }

    /**
     * Notify user about storage issues (only called once)
     */
    _notifyUser() {
        if (this.notifications) {
            this.notifications.warning(
                'Your browser storage is full. Your onboarding progress will be saved temporarily but may be lost if you close this tab. Please complete the onboarding process in this session.',
                {
                    timeout: 10000,
                    clearDuration: 300
                }
            );
        }
    }

    /**
     * Get a value from in-memory state first, then fallback to cache
     */
    get(key) {
        return this.data[key] ?? this._safeGet(`${CONTEXT_PREFIX}${key}`);
    }

    /**
     * Get a value directly from cache
     */
    getFromCache(key) {
        return this._safeGet(`${CONTEXT_PREFIX}${key}`);
    }

    /**
     * Restore all persisted onboarding context values from cache
     *
     * @returns {Object}
     */
    restore() {
        const keys = this._safeGet(KEYS_INDEX) ?? [];
        const persisted = {};

        for (const key of keys) {
            const value = this._safeGet(`${CONTEXT_PREFIX}${key}`);
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

        // Filter out sensitive fields
        const sensitiveFields = ['password', 'password_confirmation'];
        const filteredData = {};
        
        for (const [key, value] of Object.entries(data)) {
            if (!sensitiveFields.includes(key)) {
                filteredData[key] = value;
            }
        }

        this.data = { ...this.data, ...filteredData };

        if (options.persist === true) {
            const keys = new Set(this._safeGet(KEYS_INDEX) ?? []);

            for (const key of Object.keys(filteredData)) {
                keys.add(key);
                this._safeSet(`${CONTEXT_PREFIX}${key}`, this.data[key]);
            }

            this._safeSet(KEYS_INDEX, [...keys]);
        }
    }

    /**
     * Set a single value
     * Optionally persist it
     */
    set(key, value, options = {}) {
        // Don't store sensitive fields
        const sensitiveFields = ['password', 'password_confirmation'];
        if (sensitiveFields.includes(key)) {
            return;
        }

        this.data = { ...this.data, [key]: value };

        if (options.persist === true) {
            const keys = new Set(this._safeGet(KEYS_INDEX) ?? []);
            keys.add(key);

            this._safeSet(`${CONTEXT_PREFIX}${key}`, value);
            this._safeSet(KEYS_INDEX, [...keys]);
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

        const keys = new Set(this._safeGet(KEYS_INDEX) ?? []);
        keys.delete(key);

        this._safeSet(`${CONTEXT_PREFIX}${key}`, undefined);
        this._safeSet(KEYS_INDEX, [...keys]);
        
        // Also remove from memory cache
        this._memoryCache.delete(`${CONTEXT_PREFIX}${key}`);
    }

    /**
     * Fully reset onboarding context (memory + persistence)
     */
    reset() {
        const keys = this._safeGet(KEYS_INDEX) ?? [];

        for (const key of keys) {
            this._safeSet(`${CONTEXT_PREFIX}${key}`, undefined);
            this._memoryCache.delete(`${CONTEXT_PREFIX}${key}`);
        }

        this._safeSet(KEYS_INDEX, []);
        this._memoryCache.clear();
        this.data = {};
        this.quotaExceeded = false;
        this.usingMemoryFallback = false;
    }

    /**
     * Get storage status for debugging
     * 
     * @returns {Object} Storage status information
     */
    getStorageStatus() {
        return {
            quotaExceeded: this.quotaExceeded,
            usingMemoryFallback: this.usingMemoryFallback,
            memoryItemCount: this._memoryCache.size
        };
    }
}

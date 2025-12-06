import config from '@fleetbase/console/config/environment';
import toBoolean from '@fleetbase/ember-core/utils/to-boolean';
import { set } from '@ember/object';
import { debug } from '@ember/debug';

/**
 * Maps allowed runtime keys to internal config paths.
 */
const RUNTIME_CONFIG_MAP = {
    API_HOST: 'API.host',
    API_NAMESPACE: 'API.namespace',
    SOCKETCLUSTER_PATH: 'socket.path',
    SOCKETCLUSTER_HOST: 'socket.hostname',
    SOCKETCLUSTER_SECURE: 'socket.secure',
    SOCKETCLUSTER_PORT: 'socket.port',
    OSRM_HOST: 'osrm.host',
    EXTENSIONS: 'APP.extensions',
};

/**
 * Cache key for localStorage
 */
const CACHE_KEY = 'fleetbase_runtime_config';
const CACHE_VERSION_KEY = 'fleetbase_runtime_config_version';
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

/**
 * Coerce and sanitize runtime config values based on key.
 *
 * @param {String} key
 * @param {*} value
 * @return {*}
 */
function coerceValue(key, value) {
    switch (key) {
        case 'SOCKETCLUSTER_PORT':
            return parseInt(value, 10);

        case 'SOCKETCLUSTER_SECURE':
            return toBoolean(value);

        case 'EXTENSIONS':
            return typeof value === 'string' ? value.split(',') : Array.from(value);

        default:
            return value;
    }
}

/**
 * Apply runtime config overrides based on strict allowlist mapping.
 *
 * @param {Object} rawConfig
 */
export function applyRuntimeConfig(rawConfig = {}) {
    Object.entries(rawConfig).forEach(([key, value]) => {
        const configPath = RUNTIME_CONFIG_MAP[key];

        if (configPath) {
            const coercedValue = coerceValue(key, value);
            set(config, configPath, coercedValue);
        } else {
            debug(`[Runtime Config] Ignored unknown key: ${key}`);
        }
    });
}

/**
 * Get cached config from localStorage
 *
 * @returns {Object|null} Cached config or null
 */
function getCachedConfig() {
    try {
        const cached = localStorage.getItem(CACHE_KEY);
        const cachedVersion = localStorage.getItem(CACHE_VERSION_KEY);

        if (!cached || !cachedVersion) {
            return null;
        }

        // Application version has changed
        if (cachedVersion !== config.APP.version) {
            debug(`[Runtime Config] Version mismatch (cached: ${cachedVersion}, current: ${config.APP.version})`);
            return null;
        }

        const cacheData = JSON.parse(cached);
        const cacheAge = Date.now() - cacheData.timestamp;

        // Check if cache is still valid (within TTL)
        if (cacheAge > CACHE_TTL) {
            debug('[Runtime Config] Cache expired');
            return null;
        }

        debug(`[Runtime Config] Using cached config (age: ${Math.round(cacheAge / 1000)}s)`);
        return cacheData.config;
    } catch (e) {
        debug(`[Runtime Config] Failed to read cache: ${e.message}`);
        return null;
    }
}

/**
 * Save config to localStorage cache
 *
 * @param {Object} config Config object
 */
function setCachedConfig(runtimeConfig) {
    try {
        const cacheData = {
            config: runtimeConfig,
            timestamp: Date.now(),
        };
        localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
        localStorage.setItem(CACHE_VERSION_KEY, config.APP.version);
        debug('[Runtime Config] Config cached to localStorage');
    } catch (e) {
        debug(`[Runtime Config] Failed to cache config: ${e.message}`);
    }
}

/**
 * Clear cached config
 *
 * @export
 */
export function clearRuntimeConfigCache() {
    try {
        localStorage.removeItem(CACHE_KEY);
        localStorage.removeItem(CACHE_VERSION_KEY);
        debug('[Runtime Config] Cache cleared');
    } catch (e) {
        debug(`[Runtime Config] Failed to clear cache: ${e.message}`);
    }
}

/**
 * Load and apply runtime config with localStorage caching.
 *
 * Strategy:
 * 1. Check localStorage cache first (instant, no HTTP request)
 * 2. If cache hit and valid, use it immediately
 * 3. If cache miss, fetch from server and cache the result
 * 4. Cache is valid for 1 hour
 *
 * @export
 * @return {Promise<void>}
 */
export default async function loadRuntimeConfig() {
    if (config.APP.disableRuntimeConfig) {
        return;
    }

    const isProduction = config?.environment === 'production';
    if (isProduction) {
        // Try cache first
        const cachedConfig = getCachedConfig();
        if (cachedConfig) {
            applyRuntimeConfig(cachedConfig);
            return;
        }
    }

    // Cache miss - fetch from server
    try {
        const startTime = performance.now();
        const response = await fetch('/fleetbase.config.json', {
            cache: 'default', // Use browser cache if available
        });

        if (!response.ok) {
            debug('[Runtime Config] No fleetbase.config.json found, using built-in config defaults');
            return;
        }

        const runtimeConfig = await response.json();
        const endTime = performance.now();

        debug(`[Runtime Config] Fetched from server in ${(endTime - startTime).toFixed(2)}ms`);

        // Apply and cache
        applyRuntimeConfig(runtimeConfig);
        setCachedConfig(runtimeConfig);
    } catch (e) {
        debug(`[Runtime Config] Failed to load runtime config: ${e.message}`);
    }
}

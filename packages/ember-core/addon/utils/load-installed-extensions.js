import loadExtensions from '../utils/load-extensions';
import fleetbaseApiFetch from '../utils/fleetbase-api-fetch';
import config from 'ember-get-config';

export default async function loadInstalledExtensions(additionalCoreEngines = []) {
    const CORE_ENGINES = [
        '@fleetbase/fleetops-engine',
        // '@fleetbase/storefront-engine',
        // '@fleetbase/registry-bridge-engine',
        // '@fleetbase/dev-engine',
        '@fleetbase/iam-engine',
        ...additionalCoreEngines,
    ];
    const INDEXED_ENGINES = await loadExtensions();
    
    // Try to get installed engines, but don't let it block the application
    let INSTALLED_ENGINES = [];
    
    // Skip registry request in development or if API host is not available
    const isDevelopment = config.environment === 'development' || config.environment === 'test';
    const hasApiHost = config.API && config.API.host;
    
    if (!isDevelopment && hasApiHost) {
        try {
            console.log('🔍 Loading installed engines from registry...');
            INSTALLED_ENGINES = await fleetbaseApiFetch('get', 'engines', {}, { 
                namespace: '~registry/v1', 
                fallbackResponse: [],
                timeout: 3000 // 3 second timeout for registry request
            });
            console.log('✅ Installed engines loaded successfully');
        } catch (error) {
            console.warn('⚠️ Failed to load installed engines from registry, using fallback:', error.message);
            INSTALLED_ENGINES = [];
        }
    } else {
        console.log('🔍 Skipping registry request (development mode or no API host)');
    }

    const isInstalledEngine = (engineName) => {
        return CORE_ENGINES.includes(engineName) || INSTALLED_ENGINES.find((pkg) => pkg.name === engineName);
    };

    return INDEXED_ENGINES.filter((pkg) => {
        return isInstalledEngine(pkg.name);
    });
}

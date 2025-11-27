const Plugin = require('broccoli-plugin');
const fs = require('fs');
const path = require('path');
const fg = require('fast-glob');

/**
 * ExtensionDiscoveryPlugin
 * 
 * Discovers Fleetbase extensions from node_modules by scanning package.json files
 * for packages with 'fleetbase-extension' and 'ember-engine' keywords.
 * 
 * This plugin runs during build and caches the discovered extensions for use
 * by other plugins (router generation, extension loaders, etc.)
 */
class ExtensionDiscoveryPlugin extends Plugin {
    constructor(inputNodes, options = {}) {
        super(inputNodes, {
            annotation: options.annotation || 'ExtensionDiscoveryPlugin',
            persistentOutput: true,
        });
        
        this.projectRoot = options.projectRoot || process.cwd();
    }

    /**
     * Get only specific properties from an object
     */
    only(subject, props = []) {
        const keys = Object.keys(subject);
        const result = {};

        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            if (props.includes(key)) {
                result[key] = subject[key];
            }
        }

        return result;
    }

    /**
     * Discover all Fleetbase extensions from node_modules
     */
    async discoverExtensions() {
        const extensions = [];
        const seenPackages = new Set();

        const results = await fg([
            'node_modules/*/package.json',
            'node_modules/*/*/package.json'
        ], {
            cwd: this.projectRoot,
            absolute: true
        });

        for (const packagePath of results) {
            let packageData = null;

            try {
                const packageJson = fs.readFileSync(packagePath, 'utf8');
                packageData = JSON.parse(packageJson);
            } catch (e) {
                console.warn(`[ExtensionDiscovery] Could not parse package.json at ${packagePath}:`, e.message);
                continue;
            }

            // Check if this is a Fleetbase extension
            if (!packageData || 
                !packageData.keywords || 
                !packageData.keywords.includes('fleetbase-extension') || 
                !packageData.keywords.includes('ember-engine')) {
                continue;
            }

            // Skip duplicates
            if (seenPackages.has(packageData.name)) {
                continue;
            }

            seenPackages.add(packageData.name);
            
            // Extract relevant metadata
            const extension = this.only(packageData, [
                'name',
                'description',
                'version',
                'fleetbase',
                'keywords',
                'license',
                'repository'
            ]);

            extensions.push(extension);
        }

        return extensions;
    }

    async build() {
        console.log('[ExtensionDiscovery] ========================================');
        console.log('[ExtensionDiscovery] Starting extension discovery...');
        console.log('[ExtensionDiscovery] Project root:', this.projectRoot);
        console.log('[ExtensionDiscovery] Output path:', this.outputPath);
        
        const extensions = await this.discoverExtensions();
        
        // Write extensions to cache file
        const cacheFile = path.join(this.outputPath, 'extensions.json');
        fs.writeFileSync(
            cacheFile,
            JSON.stringify(extensions, null, 2),
            'utf8'
        );

        console.log('[ExtensionDiscovery] ========================================');
        console.log('[ExtensionDiscovery] ✓ Discovery complete');
        console.log('[ExtensionDiscovery] Found', extensions.length, 'extension(s):');
        extensions.forEach(ext => {
            console.log('[ExtensionDiscovery]   -', ext.name + '@' + ext.version);
        });
        console.log('[ExtensionDiscovery] Wrote extensions.json to:', cacheFile);
        console.log('[ExtensionDiscovery] ========================================');
    }
}

module.exports = ExtensionDiscoveryPlugin;

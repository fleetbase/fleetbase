const fs = require('fs');
const path = require('path');
const glob = require('glob');

/**
 * Discover Fleetbase extensions from node_modules
 */
function discoverExtensions(projectRoot) {
    const extensions = [];
    const nodeModulesPath = path.join(projectRoot, 'node_modules');

    if (!fs.existsSync(nodeModulesPath)) {
        return extensions;
    }

    // Find all package.json files in node_modules
    const packageFiles = glob.sync('*/package.json', {
        cwd: nodeModulesPath,
        absolute: true,
    });

    for (const packageFile of packageFiles) {
        try {
            const packageJson = JSON.parse(fs.readFileSync(packageFile, 'utf8'));

            // Check if it's a Fleetbase extension
            if (packageJson.keywords && packageJson.keywords.includes('fleetbase-extension')) {
                extensions.push(packageJson);
                console.log('[fleetbase-extensions-generator]   -', packageJson.name + '@' + packageJson.version);
            }
        } catch (error) {
            // Skip invalid package.json files
        }
    }

    return extensions;
}

module.exports = discoverExtensions;

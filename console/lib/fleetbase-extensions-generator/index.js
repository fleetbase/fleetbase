'use strict';

const path = require('path');
const fs = require('fs');
const fg = require('fast-glob');

console.log('[fleetbase-extensions-generator] Addon loaded at startup');

module.exports = {
    name: 'fleetbase-extensions-generator',

    isDevelopingAddon() {
        return true;
    },

    /**
     * The included hook runs once when the addon is loaded.
     * We use it to generate extension files directly to the app directory.
     */
    included(app) {
        this._super.included.apply(this, arguments);

        console.log('[fleetbase-extensions-generator] ========================================');
        console.log('[fleetbase-extensions-generator] included() hook called');
        console.log('[fleetbase-extensions-generator] Project root:', this.project.root);

        // Discover extensions and cache them
        this._extensions = this.discoverExtensions();
        console.log('[fleetbase-extensions-generator] Found', this._extensions.length, 'extension(s)');

        // Generate files directly to app directory
        this.generateExtensionShims(this._extensions);
        this.generateExtensionLoaders(this._extensions);
        this.generateRouter(this._extensions);
        this.generateExtensionsManifest(this._extensions);

        // Set up file watching for extension.js files
        this.setupFileWatching();

        console.log('[fleetbase-extensions-generator] ========================================');
    },

    /**
     * Set up file watching for extension.js files to regenerate on changes
     */
    setupFileWatching() {
        if (this.app.env !== 'development') {
            return; // Only watch in development
        }

        const chokidar = require('chokidar');
        const extensionPaths = [];

        // Collect all extension.js file paths
        for (const extension of this._extensions) {
            const extensionPath = path.join(this.project.root, 'node_modules', extension.name, 'addon', 'extension.js');

            if (fs.existsSync(extensionPath)) {
                extensionPaths.push(extensionPath);
            }
        }

        if (extensionPaths.length === 0) {
            return;
        }

        console.log('[fleetbase-extensions-generator] Watching', extensionPaths.length, 'extension file(s) for changes');

        // Watch extension files
        const watcher = chokidar.watch(extensionPaths, {
            persistent: true,
            ignoreInitial: true,
        });

        watcher.on('change', (changedPath) => {
            console.log('[fleetbase-extensions-generator] Extension file changed:', changedPath);
            console.log('[fleetbase-extensions-generator] Regenerating extension files...');

            // Regenerate all extension files
            this.generateExtensionShims(this._extensions);
            this.generateExtensionLoaders(this._extensions);

            console.log('[fleetbase-extensions-generator] ✓ Regeneration complete');
        });
    },

    /**
     * Discover Fleetbase extensions from node_modules
     */
    discoverExtensions() {
        console.log('[fleetbase-extensions-generator] Discovering extensions...');

        const extensions = [];
        const seenPackages = new Set();

        const results = fg.sync(['node_modules/*/package.json', 'node_modules/*/*/package.json'], {
            cwd: this.project.root,
            absolute: true,
        });

        for (const packagePath of results) {
            let packageData = null;

            try {
                const packageJson = fs.readFileSync(packagePath, 'utf8');
                packageData = JSON.parse(packageJson);
            } catch (e) {
                continue;
            }

            // Check if this is a Fleetbase extension
            if (!packageData || !packageData.keywords || !packageData.keywords.includes('fleetbase-extension') || !packageData.keywords.includes('ember-engine')) {
                continue;
            }

            // Skip duplicates
            if (seenPackages.has(packageData.name)) {
                continue;
            }

            seenPackages.add(packageData.name);

            const extension = {
                name: packageData.name,
                version: packageData.version,
                fleetbase: packageData.fleetbase || {},
            };

            extensions.push(extension);
            console.log('[fleetbase-extensions-generator]   -', extension.name + '@' + extension.version);
        }

        return extensions;
    },

    /**
     * Generate extension shim files in app/extensions/
     */
    generateExtensionShims(extensions) {
        console.log('[fleetbase-extensions-generator] Generating extension shims...');

        const extensionsDir = path.join(this.project.root, 'app', 'extensions');

        // Create directory
        if (!fs.existsSync(extensionsDir)) {
            fs.mkdirSync(extensionsDir, { recursive: true });
        }

        let shimCount = 0;

        for (const extension of extensions) {
            const pkgName = extension.name;
            const mountName = this.getExtensionMountPath(pkgName);

            // Path to extension.js in the engine's addon directory
            const extensionPath = path.join(this.project.root, 'node_modules', pkgName, 'addon', 'extension.js');

            // Check if extension.js exists
            if (!fs.existsSync(extensionPath)) {
                console.log('[fleetbase-extensions-generator]   ! No extension.js found for', pkgName);
                continue;
            }

            // Read the extension code
            let extensionCode;
            try {
                extensionCode = fs.readFileSync(extensionPath, 'utf8');
            } catch (error) {
                console.error('[fleetbase-extensions-generator]   ! Failed to read extension.js for', pkgName, ':', error.message);
                continue;
            }

            // Generate shim content
            const shimContent = `// GENERATED BY fleetbase-extensions-generator - DO NOT EDIT
// Extension setup for ${pkgName}
//
// This file contains the inlined extension setup code from the engine.
// It is generated at build time to enable dynamic import without loading
// the entire engine bundle.

${extensionCode}
`;

            // Write shim file
            const shimPath = path.join(extensionsDir, `${mountName}.js`);
            try {
                fs.writeFileSync(shimPath, shimContent, 'utf8');
                shimCount++;
                console.log('[fleetbase-extensions-generator]   \u2713 Generated', `app/extensions/${mountName}.js`);
            } catch (error) {
                console.error('[fleetbase-extensions-generator]   ! Failed to write shim for', pkgName, ':', error.message);
            }
        }

        console.log('[fleetbase-extensions-generator] Generated', shimCount, 'extension shim(s)');
    },

    /**
     * Generate extension loaders in app/utils/
     */
    generateExtensionLoaders(extensions) {
        console.log('[fleetbase-extensions-generator] Generating extension loaders...');

        const utilsDir = path.join(this.project.root, 'app', 'utils');

        // Create directory
        if (!fs.existsSync(utilsDir)) {
            fs.mkdirSync(utilsDir, { recursive: true });
        }

        const lines = ['// GENERATED BY fleetbase-extensions-generator - DO NOT EDIT', '// Extension loader map for dynamic imports', '', 'export const EXTENSION_LOADERS = {'];

        let loaderCount = 0;

        for (const extension of extensions) {
            const pkgName = extension.name;

            // Check if extension.js exists
            const extensionPath = path.join(this.project.root, 'node_modules', pkgName, 'addon', 'extension.js');

            if (!fs.existsSync(extensionPath)) {
                continue;
            }

            const mountName = this.getExtensionMountPath(pkgName);
            lines.push(`    '${pkgName}': () => import('@fleetbase/console/extensions/${mountName}'),`);
            loaderCount++;
        }

        lines.push('};');
        lines.push('');

        const loadersContent = lines.join('\n');
        const loadersPath = path.join(utilsDir, 'extension-loaders.generated.js');

        try {
            fs.writeFileSync(loadersPath, loadersContent, 'utf8');
            console.log('[fleetbase-extensions-generator]   \u2713 Generated app/utils/extension-loaders.generated.js with', loaderCount, 'loader(s)');
        } catch (error) {
            console.error('[fleetbase-extensions-generator]   ! Failed to write extension loaders:', error.message);
        }
    },

    /**
     * Generate router.js with extension mounts
     */
    generateRouter(extensions) {
        console.log('[fleetbase-extensions-generator] Generating router.js...');

        const routerMapFile = path.join(this.project.root, 'router.map.js');
        const routerFile = path.join(this.project.root, 'app', 'router.js');

        if (!fs.existsSync(routerMapFile)) {
            console.error('[fleetbase-extensions-generator]   ! router.map.js not found at:', routerMapFile);
            return;
        }

        // Read router.map.js (source template)
        const routerContent = fs.readFileSync(routerMapFile, 'utf8');

        // Separate extensions by mount location
        const consoleExtensions = [];
        const rootExtensions = [];

        for (const extension of extensions) {
            const mountLocation = extension.fleetbase?.route?.mountLocation || 'console';
            const route = extension.fleetbase?.route?.slug || this.getExtensionMountPath(extension.name);

            if (mountLocation === 'console') {
                consoleExtensions.push({ name: extension.name, route });
            } else if (mountLocation === 'root') {
                rootExtensions.push({ name: extension.name, route });
            }
        }

        console.log('[fleetbase-extensions-generator]   Console extensions:', consoleExtensions.length);
        console.log('[fleetbase-extensions-generator]   Root extensions:', rootExtensions.length);

        // Parse and modify the router using simple string manipulation
        // (We'll use recast for proper AST manipulation)
        const recast = require('recast');
        const babelParser = require('recast/parsers/babel');

        const ast = recast.parse(routerContent, { parser: babelParser });

        let consoleAdded = 0;
        let rootAdded = 0;

        // Add console extensions
        if (consoleExtensions.length > 0) {
            consoleAdded = this.addConsoleExtensions(ast, consoleExtensions);
        }

        // Add root extensions
        if (rootExtensions.length > 0) {
            rootAdded = this.addRootExtensions(ast, rootExtensions);
        }

        // Generate output
        const output = recast.print(ast, { quote: 'single' }).code;

        try {
            fs.writeFileSync(routerFile, output, 'utf8');
            console.log('[fleetbase-extensions-generator]   \u2713 Generated app/router.js');
            console.log('[fleetbase-extensions-generator]     - Console mounts:', consoleAdded);
            console.log('[fleetbase-extensions-generator]     - Root mounts:', rootAdded);
        } catch (error) {
            console.error('[fleetbase-extensions-generator]   ! Failed to write router.js:', error.message);
        }
    },

    /**
     * Add console extensions to the router AST
     */
    addConsoleExtensions(ast, extensions) {
        const recast = require('recast');
        const types = recast.types;
        const n = types.namedTypes;
        const b = types.builders;

        let addedCount = 0;

        types.visit(ast, {
            visitCallExpression(path) {
                const node = path.node;

                // Look for this.route('console', ...) with path: '/'
                if (
                    n.MemberExpression.check(node.callee) &&
                    n.ThisExpression.check(node.callee.object) &&
                    node.callee.property.name === 'route' &&
                    node.arguments.length > 0 &&
                    n.Literal.check(node.arguments[0]) &&
                    node.arguments[0].value === 'console' &&
                    node.arguments.length > 1 &&
                    n.ObjectExpression.check(node.arguments[1]) &&
                    node.arguments[1].properties.some((p) => n.Property.check(p) && p.key.name === 'path' && n.Literal.check(p.value) && p.value.value === '/')
                ) {
                    // Find the function expression in the third argument (after path config)
                    if (node.arguments.length > 2 && n.FunctionExpression.check(node.arguments[2])) {
                        const functionExpression = node.arguments[2];

                        // Add mount statements for each extension
                        extensions.forEach((extension) => {
                            // Check if already mounted
                            if (!this.isEngineMounted(functionExpression.body.body, extension.name)) {
                                const mountStatement = b.expressionStatement(
                                    b.callExpression(b.memberExpression(b.thisExpression(), b.identifier('mount')), [
                                        b.literal(extension.name),
                                        b.objectExpression([b.property('init', b.identifier('as'), b.literal(extension.route))]),
                                    ])
                                );

                                functionExpression.body.body.push(mountStatement);
                                addedCount++;
                            }
                        });
                    }

                    return false; // Don't traverse children
                }

                this.traverse(path);
            },
        });

        return addedCount;
    },

    /**
     * Add root extensions to the router AST
     */
    addRootExtensions(ast, extensions) {
        const recast = require('recast');
        const types = recast.types;
        const n = types.namedTypes;
        const b = types.builders;

        let addedCount = 0;

        types.visit(ast, {
            visitCallExpression: (path) => {
                const node = path.node;

                // Look for Router.map(function() { ... })
                if (
                    n.MemberExpression.check(node.callee) &&
                    n.Identifier.check(node.callee.object) &&
                    node.callee.object.name === 'Router' &&
                    node.callee.property.name === 'map' &&
                    node.arguments.length > 0 &&
                    n.FunctionExpression.check(node.arguments[0])
                ) {
                    const functionExpression = node.arguments[0];

                    // Add mount statements for each root extension
                    extensions.forEach((extension) => {
                        // Check if already mounted
                        if (!this.isEngineMounted(functionExpression.body.body, extension.name)) {
                            const mountStatement = b.expressionStatement(
                                b.callExpression(b.memberExpression(b.thisExpression(), b.identifier('mount')), [
                                    b.literal(extension.name),
                                    b.objectExpression([b.property('init', b.identifier('as'), b.literal(extension.route))]),
                                ])
                            );

                            functionExpression.body.body.push(mountStatement);
                            addedCount++;
                        }
                    });

                    return false; // Don't traverse children
                }

                this.traverse(path);
            },
        });

        return addedCount;
    },

    /**
     * Check if an engine is already mounted in the AST
     */
    isEngineMounted(statements, engineName) {
        const recast = require('recast');
        const types = recast.types;
        const n = types.namedTypes;

        for (const statement of statements) {
            if (
                n.ExpressionStatement.check(statement) &&
                n.CallExpression.check(statement.expression) &&
                n.MemberExpression.check(statement.expression.callee) &&
                statement.expression.callee.property.name === 'mount' &&
                statement.expression.arguments.length > 0 &&
                n.Literal.check(statement.expression.arguments[0]) &&
                statement.expression.arguments[0].value === engineName
            ) {
                return true;
            }
        }

        return false;
    },

    /**
     * Generate extensions.json manifest in public/
     */
    generateExtensionsManifest(extensions) {
        console.log('[fleetbase-extensions-generator] Generating extensions manifest...');

        const publicDir = path.join(this.project.root, 'public');

        // Create directory
        if (!fs.existsSync(publicDir)) {
            fs.mkdirSync(publicDir, { recursive: true });
        }

        const manifestPath = path.join(publicDir, 'extensions.json');
        const manifestContent = JSON.stringify(extensions, null, 2);

        try {
            fs.writeFileSync(manifestPath, manifestContent, 'utf8');
            console.log('[fleetbase-extensions-generator]   \u2713 Generated public/extensions.json');
        } catch (error) {
            console.error('[fleetbase-extensions-generator]   ! Failed to write extensions.json:', error.message);
        }
    },

    /**
     * Extract the mount path from an extension package name
     */
    getExtensionMountPath(extensionName) {
        const segments = extensionName.split('/');
        let mountName = segments[1] || segments[0];
        return mountName.replace('-engine', '');
    },
};

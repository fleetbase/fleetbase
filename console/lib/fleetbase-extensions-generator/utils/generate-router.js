const fs = require('fs');
const path = require('path');
const recast = require('recast');
const babelParser = require('recast/parsers/babel');

/**
 * Get the mount path for an extension from its package name
 */
function getExtensionMountPath(packageName) {
    return packageName.replace('@fleetbase/', '').replace('-engine', '');
}

/**
 * Check if an engine is already mounted in the AST
 */
function isEngineMounted(statements, engineName) {
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
}

/**
 * Add console extensions to the router AST
 */
function addConsoleExtensions(ast, extensions) {
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
                        if (!isEngineMounted(functionExpression.body.body, extension.name)) {
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
}

/**
 * Add root extensions to the router AST
 */
function addRootExtensions(ast, extensions) {
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
                    if (!isEngineMounted(functionExpression.body.body, extension.name)) {
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
}

/**
 * Generate router.js with extension mounts
 */
function generateRouter(projectRoot, extensions) {
    console.log('[fleetbase-extensions-generator] Generating router.js...');

    const routerMapFile = path.join(projectRoot, 'router.map.js');
    const routerFile = path.join(projectRoot, 'app', 'router.js');

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
        const route = extension.fleetbase?.route?.slug || getExtensionMountPath(extension.name);

        if (mountLocation === 'console') {
            consoleExtensions.push({ name: extension.name, route });
        } else if (mountLocation === 'root') {
            rootExtensions.push({ name: extension.name, route });
        }
    }

    console.log('[fleetbase-extensions-generator]   Console extensions:', consoleExtensions.length);
    console.log('[fleetbase-extensions-generator]   Root extensions:', rootExtensions.length);

    // Parse and modify the router using recast
    const ast = recast.parse(routerContent, { parser: babelParser });

    let consoleAdded = 0;
    let rootAdded = 0;

    // Add console extensions
    if (consoleExtensions.length > 0) {
        consoleAdded = addConsoleExtensions(ast, consoleExtensions);
    }

    // Add root extensions
    if (rootExtensions.length > 0) {
        rootAdded = addRootExtensions(ast, rootExtensions);
    }

    // Generate output
    const output = recast.print(ast, { quote: 'single' }).code;

    try {
        fs.writeFileSync(routerFile, output, 'utf8');
        console.log('[fleetbase-extensions-generator]   ✓ Generated app/router.js');
        console.log('[fleetbase-extensions-generator]     - Console mounts:', consoleAdded);
        console.log('[fleetbase-extensions-generator]     - Root mounts:', rootAdded);
    } catch (error) {
        console.error('[fleetbase-extensions-generator]   ! Failed to write router.js:', error.message);
    }
}

module.exports = generateRouter;

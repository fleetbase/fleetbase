import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
    disableModule,
    disableSharedPackage,
    disableSharedDependency,
    discoverModules,
    discoverPackages,
    enableModule,
    enableSharedPackage,
    enableSharedDependency,
    formatSimpleYaml,
    getInstallCommands,
    getInstallModules,
    getResetTargets,
    parseSimpleYaml,
    resetLinks,
    runCli,
    STATE_FILE,
} from './package-linker.mjs';

function writeJson(filePath, data) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, `${JSON.stringify(data, null, 4)}\n`, 'utf8');
}

function readJson(filePath) {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function createPackage(root, slug, frontendName, backendName, options = {}) {
    const packageDir = path.join(root, 'packages', slug);
    fs.mkdirSync(packageDir, { recursive: true });

    if (frontendName) {
        writeJson(path.join(packageDir, 'package.json'), {
            name: frontendName,
            version: options.frontendVersion ?? '1.2.3',
            keywords: options.keywords ?? ['fleetbase-extension', 'ember-engine'],
        });
    }

    if (backendName) {
        writeJson(path.join(packageDir, 'composer.json'), {
            name: backendName,
            version: options.backendVersion ?? '1.2.3',
            extra: {
                laravel: {
                    providers: [],
                },
            },
        });
    }

    if (options.extensionJson) {
        writeJson(path.join(packageDir, 'extension.json'), options.extensionJson);
    }
}

function createFixture() {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'package-linker-'));

    fs.mkdirSync(path.join(root, 'console'), { recursive: true });
    fs.mkdirSync(path.join(root, 'api'), { recursive: true });

    writeJson(path.join(root, 'console', 'package.json'), {
        dependencies: {
            '@fleetbase/fleetops-engine': '^0.6.48',
            '@fleetbase/ember-core': '^0.3.19',
            '@fleetbase/ember-ui': '^0.3.29',
            '@fleetbase/fleetops-data': '^0.1.32',
        },
        pnpm: {
            overrides: {
                '@fleetbase/ember-core': '^0.3.19',
                '@fleetbase/ember-ui': '^0.3.29',
                '@fleetbase/fleetops-data': '^0.1.32',
            },
        },
    });

    writeJson(path.join(root, 'api', 'composer.json'), {
        require: {
            'fleetbase/fleetops-api': '^0.6.48',
            'fleetbase/core-api': '^1.6.47',
        },
        repositories: [
            {
                type: 'composer',
                url: 'https://registry.fleetbase.io',
            },
        ],
    });

    fs.writeFileSync(
        path.join(root, 'console', 'pnpm-workspace.yaml'),
        `allowBuilds:
  core-js: false
`,
        'utf8'
    );

    fs.writeFileSync(
        path.join(root, 'console', '.npmrc'),
        `//registry.fleetbase.io/:_authToken="token"
public-hoist-pattern[]=*ember-core*
public-hoist-pattern[]=*ember-ui*
`,
        'utf8'
    );

    createPackage(root, 'fleetops', '@fleetbase/fleetops-engine', 'fleetbase/fleetops-api', {
        frontendVersion: '0.6.48',
        backendVersion: '0.6.48',
    });
    createPackage(root, 'ember-core', '@fleetbase/ember-core', null, { frontendVersion: '0.3.19', keywords: ['ember-addon'] });
    createPackage(root, 'ember-ui', '@fleetbase/ember-ui', null, { frontendVersion: '0.3.29', keywords: ['ember-addon'] });
    createPackage(root, 'fleetops-data', '@fleetbase/fleetops-data', null, { frontendVersion: '0.1.32', keywords: ['ember-addon'] });
    createPackage(root, 'core-api', null, 'fleetbase/core-api', { backendVersion: '1.6.47' });
    createPackage(root, 'dev-engine', '@fleetbase/dev-engine', null, { frontendVersion: '0.2.13', keywords: ['ember-engine'] });
    createPackage(root, 'indexer', 'fleetbase-extensions-indexer', null, { frontendVersion: '0.0.5', keywords: [] });
    createPackage(root, 'manifest-extension', '@fleetbase/manifest-extension-engine', 'fleetbase/manifest-extension-api', {
        frontendVersion: '1.0.0',
        backendVersion: '1.0.0',
        keywords: [],
        extensionJson: {
            name: 'Manifest Extension',
            version: '1.0.0',
            engine: 'package.json',
            api: 'composer.json',
        },
    });

    return root;
}

test('discoverModules only returns Fleetbase extensions and excludes ordinary packages', () => {
    const root = createFixture();
    const modules = discoverModules(root);
    const packages = discoverPackages(root);
    const moduleSlugs = modules.map((module) => module.slug);
    const packageSlugs = packages.map((module) => module.slug);

    assert.deepEqual(moduleSlugs, ['fleetops', 'manifest-extension']);
    assert.ok(packageSlugs.includes('dev-engine'));
    assert.ok(packageSlugs.includes('indexer'));
    assert.equal(moduleSlugs.includes('dev-engine'), false);
    assert.equal(moduleSlugs.includes('indexer'), false);
    assert.equal(moduleSlugs.includes('ember-ui'), false);
    assert.equal(moduleSlugs.includes('core-api'), false);
});

test('formatSimpleYaml quotes scoped override keys so pnpm can parse the workspace file', () => {
    const yaml = formatSimpleYaml({
        overrides: {
            '@fleetbase/fleetops-data': 'workspace:*',
        },
    });

    assert.match(yaml, /"@fleetbase\/fleetops-data": "workspace:\*"/);
});

test('enableModule links frontend/backend module and shared workspace packages', () => {
    const root = createFixture();

    enableModule(root, 'fleetops', {
        shared: ['ember-core', 'ember-ui', 'fleetops-data'],
    });

    const packageJson = readJson(path.join(root, 'console', 'package.json'));
    const composerJson = readJson(path.join(root, 'api', 'composer.json'));
    const workspace = parseSimpleYaml(fs.readFileSync(path.join(root, 'console', 'pnpm-workspace.yaml'), 'utf8'));
    const npmrc = fs.readFileSync(path.join(root, 'console', '.npmrc'), 'utf8');
    const state = readJson(path.join(root, STATE_FILE));

    assert.equal(packageJson.dependencies['@fleetbase/fleetops-engine'], 'link:../packages/fleetops');
    assert.equal(packageJson.dependencies['@fleetbase/ember-ui'], 'workspace:*');
    assert.equal(packageJson.pnpm, undefined);
    assert.equal(composerJson.require['fleetbase/fleetops-api'], '^0.6.48');
    assert.deepEqual(composerJson.repositories[0], {
        type: 'path',
        url: '../packages/fleetops',
        options: {
            symlink: true,
        },
    });
    assert.deepEqual(workspace.packages, ['../packages/ember-core', '../packages/ember-ui', '../packages/fleetops', '../packages/fleetops-data']);
    assert.equal(workspace.linkWorkspacePackages, 'deep');
    assert.equal(workspace.preferWorkspacePackages, true);
    assert.equal(workspace.overrides['@fleetbase/ember-core'], 'workspace:*');
    assert.deepEqual(workspace.publicHoistPattern, ['*ember-core*', '*ember-ui*']);
    assert.match(npmrc, /_authToken/);
    assert.doesNotMatch(npmrc, /public-hoist-pattern/);
    assert.equal(state.modules.fleetops.npm.originalRange, '^0.6.48');
    assert.equal(state.shared['@fleetbase/ember-ui'].originalRange, '^0.3.29');
});

test('runCli can enable and disable multiple extensions in one command', () => {
    const root = createFixture();

    runCli(['enable', 'fleetops', 'manifest-extension', '--shared', 'ember-ui', '--root', root]);

    let packageJson = readJson(path.join(root, 'console', 'package.json'));
    let composerJson = readJson(path.join(root, 'api', 'composer.json'));
    let workspace = parseSimpleYaml(fs.readFileSync(path.join(root, 'console', 'pnpm-workspace.yaml'), 'utf8'));
    let state = readJson(path.join(root, STATE_FILE));

    assert.equal(packageJson.dependencies['@fleetbase/fleetops-engine'], 'link:../packages/fleetops');
    assert.equal(packageJson.dependencies['@fleetbase/manifest-extension-engine'], 'link:../packages/manifest-extension');
    assert.equal(packageJson.dependencies['@fleetbase/ember-ui'], 'workspace:*');
    assert.ok(composerJson.repositories.some((repository) => repository.type === 'path' && repository.url === '../packages/fleetops'));
    assert.ok(composerJson.repositories.some((repository) => repository.type === 'path' && repository.url === '../packages/manifest-extension'));
    assert.deepEqual(workspace.packages, ['../packages/ember-ui', '../packages/fleetops', '../packages/manifest-extension']);
    assert.deepEqual(Object.keys(state.modules), ['fleetops', 'manifest-extension']);

    runCli(['disable', 'fleetops', 'manifest-extension', '--root', root]);

    packageJson = readJson(path.join(root, 'console', 'package.json'));
    composerJson = readJson(path.join(root, 'api', 'composer.json'));
    workspace = parseSimpleYaml(fs.readFileSync(path.join(root, 'console', 'pnpm-workspace.yaml'), 'utf8'));
    state = readJson(path.join(root, STATE_FILE));

    assert.equal(packageJson.dependencies['@fleetbase/fleetops-engine'], '^0.6.48');
    assert.equal(packageJson.dependencies['@fleetbase/manifest-extension-engine'], '^1.0.0');
    assert.equal(packageJson.dependencies['@fleetbase/ember-ui'], 'workspace:*');
    assert.equal(composerJson.repositories.some((repository) => repository.type === 'path' && repository.url === '../packages/fleetops'), false);
    assert.equal(composerJson.repositories.some((repository) => repository.type === 'path' && repository.url === '../packages/manifest-extension'), false);
    assert.deepEqual(workspace.packages, ['../packages/ember-ui']);
    assert.deepEqual(state.modules, {});
    assert.ok(state.shared['@fleetbase/ember-ui']);
});

test('getInstallModules infers linked extensions and builds combined commands', () => {
    const root = createFixture();

    runCli(['enable', 'fleetops', 'manifest-extension', '--shared', 'ember-ui', '--root', root]);

    const modules = getInstallModules(root);
    const commands = getInstallCommands(modules);

    assert.deepEqual(
        modules.map((module) => module.slug),
        ['fleetops', 'manifest-extension']
    );
    assert.deepEqual(commands, ['cd console && pnpm install', 'cd api && composer update fleetbase/fleetops-api fleetbase/manifest-extension-api --with-dependencies']);
});

test('enableSharedDependency links backend-only core-api through Composer', () => {
    const root = createFixture();

    enableSharedDependency(root, 'core-api');

    let packageJson = readJson(path.join(root, 'console', 'package.json'));
    let composerJson = readJson(path.join(root, 'api', 'composer.json'));
    let workspace = parseSimpleYaml(fs.readFileSync(path.join(root, 'console', 'pnpm-workspace.yaml'), 'utf8'));
    let state = readJson(path.join(root, STATE_FILE));

    assert.equal(packageJson.dependencies['@fleetbase/ember-core'], '^0.3.19');
    assert.equal(composerJson.require['fleetbase/core-api'], '^1.6.47');
    assert.ok(composerJson.repositories.some((repository) => repository.type === 'path' && repository.url === '../packages/core-api' && repository.options?.symlink === true));
    assert.equal(workspace.packages, undefined);
    assert.equal(state.shared['fleetbase/core-api'].type, 'backend');

    disableSharedDependency(root, 'fleetbase/core-api');

    packageJson = readJson(path.join(root, 'console', 'package.json'));
    composerJson = readJson(path.join(root, 'api', 'composer.json'));
    workspace = parseSimpleYaml(fs.readFileSync(path.join(root, 'console', 'pnpm-workspace.yaml'), 'utf8'));
    state = readJson(path.join(root, STATE_FILE));

    assert.equal(packageJson.dependencies['@fleetbase/ember-core'], '^0.3.19');
    assert.equal(composerJson.require['fleetbase/core-api'], '^1.6.47');
    assert.equal(composerJson.repositories.some((repository) => repository.type === 'path' && repository.url === '../packages/core-api'), false);
    assert.equal(workspace.packages, undefined);
    assert.deepEqual(state.shared, {});
});

test('getInstallModules accepts backend-only core-api and includes it in composer update', () => {
    const root = createFixture();

    runCli(['enable-shared', 'core-api', '--root', root]);

    const explicitModules = getInstallModules(root, ['core-api']);
    const inferredModules = getInstallModules(root);

    assert.deepEqual(
        explicitModules.map((module) => module.slug),
        ['core-api']
    );
    assert.deepEqual(getInstallCommands(explicitModules), ['cd console && pnpm install', 'cd api && composer update fleetbase/core-api --with-dependencies']);
    assert.deepEqual(
        inferredModules.map((module) => module.slug),
        ['core-api']
    );
});

test('resetLinks restores all extension and shared package links', () => {
    const root = createFixture();

    runCli(['enable', 'fleetops', 'manifest-extension', '--shared', 'ember-core', 'ember-ui', 'fleetops-data', '--root', root]);
    runCli(['enable-shared', 'core-api', '--root', root]);

    const targets = getResetTargets(root);
    assert.deepEqual(
        targets.modules.map((module) => module.slug),
        ['fleetops', 'manifest-extension']
    );
    assert.deepEqual(
        targets.shared.map((shared) => shared.packageName),
        ['@fleetbase/ember-core', '@fleetbase/ember-ui', '@fleetbase/fleetops-data', 'fleetbase/core-api']
    );

    const resetModules = resetLinks(root);
    const packageJson = readJson(path.join(root, 'console', 'package.json'));
    const composerJson = readJson(path.join(root, 'api', 'composer.json'));
    const workspace = parseSimpleYaml(fs.readFileSync(path.join(root, 'console', 'pnpm-workspace.yaml'), 'utf8'));

    assert.deepEqual(
        resetModules.map((module) => module.slug),
        ['fleetops', 'manifest-extension', 'ember-core', 'ember-ui', 'fleetops-data', 'core-api']
    );
    assert.equal(packageJson.dependencies['@fleetbase/fleetops-engine'], '^0.6.48');
    assert.equal(packageJson.dependencies['@fleetbase/manifest-extension-engine'], '^1.0.0');
    assert.equal(packageJson.dependencies['@fleetbase/ember-core'], '^0.3.19');
    assert.equal(packageJson.dependencies['@fleetbase/ember-ui'], '^0.3.29');
    assert.equal(packageJson.dependencies['@fleetbase/fleetops-data'], '^0.1.32');
    assert.equal(composerJson.repositories.some((repository) => repository.type === 'path'), false);
    assert.equal(workspace.packages, undefined);
    assert.deepEqual(workspace.overrides, {
        '@fleetbase/ember-core': '^0.3.19',
        '@fleetbase/ember-ui': '^0.3.29',
        '@fleetbase/fleetops-data': '^0.1.32',
    });
    assert.equal(fs.existsSync(path.join(root, STATE_FILE)), false);
});

test('reset dry-run previews changes without mutating the fixture root', () => {
    const root = createFixture();

    runCli(['enable', 'fleetops', '--shared', 'ember-ui', '--root', root]);

    const beforePackageJson = fs.readFileSync(path.join(root, 'console', 'package.json'), 'utf8');
    const beforeComposerJson = fs.readFileSync(path.join(root, 'api', 'composer.json'), 'utf8');
    const logs = [];
    const originalLog = console.log;

    console.log = (message = '') => logs.push(String(message));
    try {
        runCli(['reset', '--dry-run', '--root', root]);
    } finally {
        console.log = originalLog;
    }

    assert.equal(fs.readFileSync(path.join(root, 'console', 'package.json'), 'utf8'), beforePackageJson);
    assert.equal(fs.readFileSync(path.join(root, 'api', 'composer.json'), 'utf8'), beforeComposerJson);
    assert.match(logs.join('\n'), /Reset 2 local development links/);
    assert.match(logs.join('\n'), /Dry run: would update/);
});

test('install dry-run prints the command shorthand without running installs', () => {
    const root = createFixture();
    const logs = [];
    const originalLog = console.log;

    runCli(['enable', 'fleetops', '--root', root]);

    console.log = (message = '') => logs.push(String(message));
    try {
        runCli(['install', '--dry-run', '--root', root]);
    } finally {
        console.log = originalLog;
    }

    assert.match(logs.join('\n'), /Install commands:/);
    assert.match(logs.join('\n'), /cd console && pnpm install/);
    assert.match(logs.join('\n'), /composer update fleetbase\/fleetops-api --with-dependencies/);
});

test('disableModule and disableSharedPackage restore original ranges and remove dev workspace entries', () => {
    const root = createFixture();

    enableModule(root, 'fleetops', {
        shared: ['ember-ui'],
    });
    disableModule(root, 'fleetops');
    disableSharedPackage(root, 'ember-ui');

    const packageJson = readJson(path.join(root, 'console', 'package.json'));
    const composerJson = readJson(path.join(root, 'api', 'composer.json'));
    const workspace = parseSimpleYaml(fs.readFileSync(path.join(root, 'console', 'pnpm-workspace.yaml'), 'utf8'));
    const state = readJson(path.join(root, STATE_FILE));

    assert.equal(packageJson.dependencies['@fleetbase/fleetops-engine'], '^0.6.48');
    assert.equal(packageJson.dependencies['@fleetbase/ember-ui'], '^0.3.29');
    assert.equal(composerJson.repositories.some((repository) => repository.type === 'path' && repository.url === '../packages/fleetops'), false);
    assert.equal(workspace.packages, undefined);
    assert.equal(workspace.overrides['@fleetbase/ember-ui'], '^0.3.29');
    assert.deepEqual(state.modules, {});
    assert.deepEqual(state.shared, {});
});

test('enableSharedPackage can be used independently', () => {
    const root = createFixture();

    enableSharedPackage(root, '@fleetbase/ember-core');

    const packageJson = readJson(path.join(root, 'console', 'package.json'));
    const workspace = parseSimpleYaml(fs.readFileSync(path.join(root, 'console', 'pnpm-workspace.yaml'), 'utf8'));

    assert.equal(packageJson.dependencies['@fleetbase/ember-core'], 'workspace:*');
    assert.equal(workspace.overrides['@fleetbase/ember-core'], 'workspace:*');
    assert.deepEqual(workspace.packages, ['../packages/ember-core']);
});

test('dry-run previews changes without mutating the fixture root', () => {
    const root = createFixture();
    const beforePackageJson = fs.readFileSync(path.join(root, 'console', 'package.json'), 'utf8');
    const beforeComposerJson = fs.readFileSync(path.join(root, 'api', 'composer.json'), 'utf8');
    const logs = [];
    const originalLog = console.log;

    console.log = (message = '') => logs.push(String(message));
    try {
        runCli(['enable', 'fleetops', '--shared', 'ember-ui', '--dry-run', '--root', root]);
    } finally {
        console.log = originalLog;
    }

    assert.equal(fs.readFileSync(path.join(root, 'console', 'package.json'), 'utf8'), beforePackageJson);
    assert.equal(fs.readFileSync(path.join(root, 'api', 'composer.json'), 'utf8'), beforeComposerJson);
    assert.equal(fs.existsSync(path.join(root, STATE_FILE)), false);
    assert.match(logs.join('\n'), /Dry run: would update/);
});

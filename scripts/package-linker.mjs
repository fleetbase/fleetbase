#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

export const DEFAULT_ROOT = path.resolve(__dirname, '..');
export const STATE_FILE = '.fleetbase-dev-links.json';
export const DEFAULT_SHARED_PACKAGES = ['@fleetbase/ember-core', '@fleetbase/ember-ui', '@fleetbase/fleetops-data'];
export const DEFAULT_SHARED_BACKEND_PACKAGES = ['fleetbase/core-api'];

function usage() {
    return `Fleetbase package linker

Usage:
  flb-package-linker list [--root <path>]
  flb-package-linker status [--root <path>]
  flb-package-linker doctor [--root <path>]
  flb-package-linker enable <module...> [--shared <pkg...>] [--install] [--dry-run] [--root <path>]
  flb-package-linker disable <module...> [--dry-run] [--root <path>]
  flb-package-linker enable-shared <pkg...> [--install] [--dry-run] [--root <path>]
  flb-package-linker disable-shared <pkg...> [--dry-run] [--root <path>]
  flb-package-linker reset [--install] [--dry-run] [--root <path>]
  flb-package-linker install [module...] [--dry-run] [--root <path>]

Examples:
  flb-package-linker enable fleetops pallet --shared ember-core ember-ui fleetops-data
  flb-package-linker enable-shared core-api
  flb-package-linker reset
  flb-package-linker enable fleetops --install
  flb-package-linker install
  flb-package-linker install fleetops pallet core-api
  flb-package-linker doctor

Local fallback:
  node scripts/package-linker.mjs doctor
`;
}

function sortObject(subject) {
    return Object.fromEntries(Object.entries(subject).sort(([left], [right]) => left.localeCompare(right)));
}

function readText(filePath, fallback = null) {
    if (!fs.existsSync(filePath)) {
        return fallback;
    }

    return fs.readFileSync(filePath, 'utf8');
}

function writeText(filePath, contents) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, contents, 'utf8');
}

function readJson(filePath, fallback = null) {
    const contents = readText(filePath);

    if (contents === null) {
        return fallback;
    }

    return JSON.parse(contents);
}

function writeJson(filePath, data) {
    writeText(filePath, `${JSON.stringify(data, null, 4)}\n`);
}

function unique(items) {
    return [...new Set(items.filter(Boolean))];
}

function workspacePathForPackage(packageDir) {
    return path.posix.join('..', 'packages', path.basename(packageDir));
}

function linkPathForHost(packageDir) {
    return `link:${workspacePathForPackage(packageDir)}`;
}

function workspaceSpecFor(packageDir) {
    return 'workspace:*';
}

function composerRepositoryFor(packageDir) {
    return {
        type: 'path',
        url: workspacePathForPackage(packageDir),
        options: {
            symlink: true,
        },
    };
}

function makeEmptyState() {
    return {
        version: 1,
        modules: {},
        shared: {},
    };
}

function readState(root) {
    const state = readJson(path.join(root, STATE_FILE), makeEmptyState());
    state.version ??= 1;
    state.modules ??= {};
    state.shared ??= {};
    return state;
}

function writeState(root, state) {
    const normalized = {
        version: 1,
        modules: sortObject(state.modules ?? {}),
        shared: sortObject(state.shared ?? {}),
    };

    writeJson(path.join(root, STATE_FILE), normalized);
}

function removeEmptyState(root) {
    const state = readState(root);

    if (Object.keys(state.modules ?? {}).length > 0 || Object.keys(state.shared ?? {}).length > 0) {
        return;
    }

    const statePath = path.join(root, STATE_FILE);
    if (fs.existsSync(statePath)) {
        fs.unlinkSync(statePath);
    }
}

function readPackageJson(root, relativePath) {
    return readJson(path.join(root, relativePath));
}

function writePackageJson(root, relativePath, data) {
    writeJson(path.join(root, relativePath), data);
}

function parseScalar(value) {
    if (value === 'true') {
        return true;
    }

    if (value === 'false') {
        return false;
    }

    return value.replace(/^['"]|['"]$/g, '');
}

export function parseSimpleYaml(contents = '') {
    const data = {};
    let currentKey = null;

    for (const rawLine of contents.split(/\r?\n/)) {
        const line = rawLine.trimEnd();

        if (!line.trim() || line.trimStart().startsWith('#')) {
            continue;
        }

        const topLevelMatch = line.match(/^([A-Za-z0-9_-]+):(?:\s*(.*))?$/);

        if (topLevelMatch && !line.startsWith(' ')) {
            currentKey = topLevelMatch[1];
            const value = topLevelMatch[2] ?? '';

            if (!value) {
                data[currentKey] = undefined;
            } else {
                data[currentKey] = parseScalar(value);
                currentKey = null;
            }

            continue;
        }

        if (!currentKey) {
            continue;
        }

        const listMatch = line.match(/^\s+-\s+(.+)$/);

        if (listMatch) {
            if (!Array.isArray(data[currentKey])) {
                data[currentKey] = [];
            }

            data[currentKey].push(parseScalar(listMatch[1]));
            continue;
        }

        const objectMatch = line.match(/^\s+([^:]+):\s*(.*)$/);

        if (objectMatch) {
            if (!data[currentKey] || Array.isArray(data[currentKey])) {
                data[currentKey] = {};
            }

            data[currentKey][parseScalar(objectMatch[1].trim())] = parseScalar(objectMatch[2].trim());
        }
    }

    return data;
}

export function formatSimpleYaml(data) {
    const lines = [];
    const keyOrder = ['packages', 'linkWorkspacePackages', 'preferWorkspacePackages', 'publicHoistPattern', 'overrides', 'allowBuilds'];
    const keys = unique([...keyOrder, ...Object.keys(data)]).filter((key) => data[key] !== undefined);

    for (const key of keys) {
        const value = data[key];

        if (Array.isArray(value)) {
            lines.push(`${key}:`);
            for (const item of value) {
                lines.push(`  - ${formatYamlValue(item)}`);
            }
            continue;
        }

        if (value && typeof value === 'object') {
            lines.push(`${key}:`);
            for (const [objectKey, objectValue] of Object.entries(value)) {
                lines.push(`  ${formatYamlKey(objectKey)}: ${formatYamlValue(objectValue)}`);
            }
            continue;
        }

        lines.push(`${key}: ${formatYamlValue(value)}`);
    }

    return `${lines.join('\n')}\n`;
}

function formatYamlKey(key) {
    const stringKey = String(key);

    if (/^['"].*['"]$/.test(stringKey)) {
        return stringKey;
    }

    if (/^[A-Za-z0-9_.-]+$/.test(stringKey)) {
        return stringKey;
    }

    return JSON.stringify(stringKey);
}

function formatYamlValue(value) {
    if (typeof value === 'boolean') {
        return String(value);
    }

    const stringValue = String(value);

    if (/^[A-Za-z0-9_.-]+$/.test(stringValue)) {
        return stringValue;
    }

    return JSON.stringify(stringValue);
}

function readWorkspace(root) {
    return parseSimpleYaml(readText(path.join(root, 'console', 'pnpm-workspace.yaml'), ''));
}

function writeWorkspace(root, data) {
    writeText(path.join(root, 'console', 'pnpm-workspace.yaml'), formatSimpleYaml(data));
}

function readNpmrc(root) {
    return readText(path.join(root, 'console', '.npmrc'), '');
}

export function migratePnpmSettingsFromNpmrc(root, workspace) {
    const npmrcPath = path.join(root, 'console', '.npmrc');
    const npmrc = readNpmrc(root);
    const publicHoistPattern = [...(workspace.publicHoistPattern ?? [])];
    const remaining = [];

    for (const line of npmrc.split(/\r?\n/)) {
        const match = line.match(/^public-hoist-pattern\[\]\s*=\s*(.+)$/);

        if (match) {
            publicHoistPattern.push(match[1].trim().replace(/^['"]|['"]$/g, ''));
            continue;
        }

        remaining.push(line);
    }

    if (publicHoistPattern.length > 0) {
        workspace.publicHoistPattern = unique(publicHoistPattern);
    }

    const nextNpmrc = remaining.join('\n').replace(/\n{3,}/g, '\n\n').replace(/\s+$/, '\n');
    writeText(npmrcPath, nextNpmrc);

    return workspace;
}

function readExtensionJson(dir) {
    return readJson(path.join(dir, 'extension.json'), null);
}

function hasFleetbaseExtensionKeyword(packageJson) {
    return Boolean(packageJson?.keywords?.includes('fleetbase-extension'));
}

function isSharedDependency(module) {
    return Boolean(module.frontend && DEFAULT_SHARED_PACKAGES.includes(module.frontend));
}

function isSharedBackendDependency(module) {
    return Boolean(module.backend && DEFAULT_SHARED_BACKEND_PACKAGES.includes(module.backend));
}

export function discoverPackages(root = DEFAULT_ROOT) {
    const packagesDir = path.join(root, 'packages');

    if (!fs.existsSync(packagesDir)) {
        return [];
    }

    return fs
        .readdirSync(packagesDir, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => {
            const dir = path.join(packagesDir, entry.name);
            const packageJson = readJson(path.join(dir, 'package.json'), null);
            const composerJson = readJson(path.join(dir, 'composer.json'), null);
            const extensionJson = readExtensionJson(dir);
            return {
                slug: entry.name,
                dir,
                frontend: packageJson?.name ?? null,
                backend: composerJson?.name ?? null,
                version: packageJson?.version ?? composerJson?.version ?? null,
                extension: extensionJson,
                isExtension: Boolean(hasFleetbaseExtensionKeyword(packageJson) || extensionJson),
            };
        })
        .filter((module) => module.frontend || module.backend)
        .sort((left, right) => left.slug.localeCompare(right.slug));
}

export function discoverModules(root = DEFAULT_ROOT) {
    return discoverPackages(root).filter((module) => module.isExtension);
}

function discoverSharedDependencies(root = DEFAULT_ROOT) {
    return discoverPackages(root).filter(isSharedDependency);
}

function discoverSharedBackendDependencies(root = DEFAULT_ROOT) {
    return discoverPackages(root).filter(isSharedBackendDependency);
}

function findModule(root, moduleName) {
    const modules = discoverModules(root);
    const normalized = moduleName.toLowerCase();
    const module = modules.find((candidate) => {
        return candidate.slug.toLowerCase() === normalized || candidate.frontend?.toLowerCase() === normalized || candidate.backend?.toLowerCase() === normalized;
    });

    if (!module) {
        throw new Error(`Unable to find module "${moduleName}" under packages/. Run "list" to see available modules.`);
    }

    return module;
}

function normalizeSharedPackage(root, packageName) {
    let name = packageName;

    if (!name.startsWith('@fleetbase/')) {
        name = `@fleetbase/${name}`;
    }

    const modules = discoverSharedDependencies(root);
    const module = modules.find((candidate) => candidate.frontend === name || candidate.slug === name.replace('@fleetbase/', ''));

    if (!module?.frontend) {
        throw new Error(`Unable to find allowed shared frontend package "${packageName}" under packages/. Allowed packages: ${DEFAULT_SHARED_PACKAGES.join(', ')}.`);
    }

    return module;
}

function normalizeSharedBackendPackage(root, packageName) {
    let name = packageName;

    if (!name.includes('/')) {
        name = `fleetbase/${name}`;
    }

    const modules = discoverSharedBackendDependencies(root);
    const module = modules.find((candidate) => candidate.backend === name || candidate.slug === name.replace('fleetbase/', ''));

    if (!module?.backend) {
        throw new Error(`Unable to find allowed shared backend package "${packageName}" under packages/. Allowed packages: ${DEFAULT_SHARED_BACKEND_PACKAGES.join(', ')}.`);
    }

    return module;
}

function isSharedBackendPackageName(root, packageName) {
    try {
        normalizeSharedBackendPackage(root, packageName);
        return true;
    } catch {
        return false;
    }
}

function activeWorkspacePackages(state) {
    const modulePackages = Object.values(state.modules ?? {})
        .map((entry) => entry.workspacePath)
        .filter(Boolean);
    const sharedPackages = Object.values(state.shared ?? {})
        .map((entry) => entry.workspacePath)
        .filter(Boolean);

    return unique([...modulePackages, ...sharedPackages]);
}

function ensureWorkspaceEntry(workspace, workspacePath) {
    workspace.packages = unique([...(workspace.packages ?? []), workspacePath]).sort();
}

function removeWorkspaceEntry(workspace, workspacePath, state) {
    if (activeWorkspacePackages(state).includes(workspacePath)) {
        return;
    }

    workspace.packages = (workspace.packages ?? []).filter((entry) => entry !== workspacePath);
    if (workspace.packages.length === 0) {
        delete workspace.packages;
    }
}

function ensureWorkspaceDevelopmentSettings(root, workspace) {
    migratePnpmSettingsFromNpmrc(root, workspace);
    workspace.linkWorkspacePackages = 'deep';
    workspace.preferWorkspacePackages = true;
    workspace.overrides ??= {};
    return workspace;
}

function findRepositoryIndex(composerJson, repository) {
    return (composerJson.repositories ?? []).findIndex((candidate) => candidate.type === 'path' && candidate.url === repository.url);
}

function packageVersionRange(packageJson) {
    if (!packageJson?.version) {
        return '*';
    }

    return packageJson.version === '*' ? '*' : `^${packageJson.version}`;
}

function originalNpmRange(currentRange, packageJson) {
    if (currentRange && !currentRange.startsWith('link:') && !currentRange.startsWith('workspace:')) {
        return currentRange;
    }

    return packageVersionRange(packageJson);
}

export function enableModule(root, moduleName, options = {}) {
    const module = findModule(root, moduleName);
    const state = readState(root);
    const consolePackage = readPackageJson(root, path.join('console', 'package.json'));
    const apiComposer = readPackageJson(root, path.join('api', 'composer.json'));
    const workspace = ensureWorkspaceDevelopmentSettings(root, readWorkspace(root));
    const moduleState = state.modules[module.slug] ?? {};
    const workspacePath = workspacePathForPackage(module.dir);

    moduleState.workspacePath = workspacePath;

    if (module.frontend) {
        const modulePackage = readJson(path.join(module.dir, 'package.json'), null);
        consolePackage.dependencies ??= {};
        moduleState.npm ??= {
            packageName: module.frontend,
            originalRange: originalNpmRange(consolePackage.dependencies[module.frontend], modulePackage),
        };
        consolePackage.dependencies[module.frontend] = linkPathForHost(module.dir);
        ensureWorkspaceEntry(workspace, workspacePath);
    }

    if (module.backend) {
        apiComposer.require ??= {};
        moduleState.composer ??= {
            packageName: module.backend,
            originalRange: apiComposer.require[module.backend] ?? packageVersionRange(readJson(path.join(module.dir, 'composer.json'), null)),
            originalRepository: null,
        };
        apiComposer.require[module.backend] = moduleState.composer.originalRange;

        apiComposer.repositories ??= [];
        const repository = composerRepositoryFor(module.dir);
        const repositoryIndex = findRepositoryIndex(apiComposer, repository);

        if (repositoryIndex === -1) {
            apiComposer.repositories.unshift(repository);
        } else {
            apiComposer.repositories[repositoryIndex] = {
                ...apiComposer.repositories[repositoryIndex],
                options: {
                    ...(apiComposer.repositories[repositoryIndex].options ?? {}),
                    symlink: true,
                },
            };
        }
    }

    state.modules[module.slug] = moduleState;

    const sharedBackendPackages = [];
    for (const sharedPackage of options.shared ?? []) {
        if (isSharedBackendPackageName(root, sharedPackage)) {
            sharedBackendPackages.push(sharedPackage);
        } else {
            enableSharedPackage(root, sharedPackage, { state, workspace, consolePackage, write: false });
        }
    }

    writePackageJson(root, path.join('console', 'package.json'), consolePackage);
    writePackageJson(root, path.join('api', 'composer.json'), apiComposer);
    writeWorkspace(root, workspace);
    writeState(root, state);

    for (const sharedPackage of sharedBackendPackages) {
        enableSharedBackendPackage(root, sharedPackage);
    }

    return module;
}

export function disableModule(root, moduleName) {
    const module = findModule(root, moduleName);
    const state = readState(root);
    const consolePackage = readPackageJson(root, path.join('console', 'package.json'));
    const apiComposer = readPackageJson(root, path.join('api', 'composer.json'));
    const workspace = readWorkspace(root);
    const moduleState = state.modules[module.slug] ?? {};
    const workspacePath = workspacePathForPackage(module.dir);

    if (module.frontend && consolePackage.dependencies?.[module.frontend]) {
        consolePackage.dependencies[module.frontend] = moduleState.npm?.originalRange ?? packageVersionRange(readJson(path.join(module.dir, 'package.json'), null));
    }

    if (module.backend && apiComposer.require?.[module.backend]) {
        apiComposer.require[module.backend] = moduleState.composer?.originalRange ?? packageVersionRange(readJson(path.join(module.dir, 'composer.json'), null));
    }

    if (module.backend && Array.isArray(apiComposer.repositories)) {
        const repository = composerRepositoryFor(module.dir);
        const repositoryIndex = findRepositoryIndex(apiComposer, repository);

        if (repositoryIndex >= 0) {
            if (moduleState.composer?.originalRepository) {
                apiComposer.repositories[repositoryIndex] = moduleState.composer.originalRepository;
            } else {
                apiComposer.repositories.splice(repositoryIndex, 1);
            }
        }
    }

    delete state.modules[module.slug];
    removeWorkspaceEntry(workspace, workspacePath, state);

    writePackageJson(root, path.join('console', 'package.json'), consolePackage);
    writePackageJson(root, path.join('api', 'composer.json'), apiComposer);
    writeWorkspace(root, workspace);
    writeState(root, state);

    return module;
}

export function enableSharedPackage(root, packageName, options = {}) {
    const module = normalizeSharedPackage(root, packageName);
    const state = options.state ?? readState(root);
    const consolePackage = options.consolePackage ?? readPackageJson(root, path.join('console', 'package.json'));
    const workspace = options.workspace ?? ensureWorkspaceDevelopmentSettings(root, readWorkspace(root));
    const originalOverride = workspace.overrides?.[module.frontend] ?? consolePackage.pnpm?.overrides?.[module.frontend] ?? null;
    const workspacePath = workspacePathForPackage(module.dir);

    state.shared[module.frontend] ??= {
        originalRange: originalNpmRange(consolePackage.dependencies?.[module.frontend], readJson(path.join(module.dir, 'package.json'), null)),
        originalOverride,
        workspacePath,
    };

    consolePackage.dependencies ??= {};
    consolePackage.dependencies[module.frontend] = workspaceSpecFor(module.dir);

    workspace.overrides ??= {};
    workspace.overrides[module.frontend] = workspaceSpecFor(module.dir);
    ensureWorkspaceEntry(workspace, workspacePath);

    if (consolePackage.pnpm?.overrides?.[module.frontend]) {
        delete consolePackage.pnpm.overrides[module.frontend];
        if (Object.keys(consolePackage.pnpm.overrides).length === 0) {
            delete consolePackage.pnpm.overrides;
        }
        if (Object.keys(consolePackage.pnpm).length === 0) {
            delete consolePackage.pnpm;
        }
    }

    if (options.write !== false) {
        writePackageJson(root, path.join('console', 'package.json'), consolePackage);
        writeWorkspace(root, workspace);
        writeState(root, state);
    }

    return module;
}

export function enableSharedBackendPackage(root, packageName) {
    const module = normalizeSharedBackendPackage(root, packageName);
    const state = readState(root);
    const apiComposer = readPackageJson(root, path.join('api', 'composer.json'));
    const repository = composerRepositoryFor(module.dir);
    const repositoryIndex = findRepositoryIndex(apiComposer, repository);

    state.shared[module.backend] ??= {
        type: 'backend',
        originalRange: apiComposer.require?.[module.backend] ?? packageVersionRange(readJson(path.join(module.dir, 'composer.json'), null)),
        originalRepository: repositoryIndex >= 0 ? apiComposer.repositories[repositoryIndex] : null,
        packageDir: path.basename(module.dir),
    };

    apiComposer.require ??= {};
    apiComposer.require[module.backend] = state.shared[module.backend].originalRange;
    apiComposer.repositories ??= [];

    if (repositoryIndex === -1) {
        apiComposer.repositories.unshift(repository);
    } else {
        apiComposer.repositories[repositoryIndex] = {
            ...apiComposer.repositories[repositoryIndex],
            options: {
                ...(apiComposer.repositories[repositoryIndex].options ?? {}),
                symlink: true,
            },
        };
    }

    writePackageJson(root, path.join('api', 'composer.json'), apiComposer);
    writeState(root, state);

    return module;
}

export function enableSharedDependency(root, packageName, options = {}) {
    if (isSharedBackendPackageName(root, packageName)) {
        return enableSharedBackendPackage(root, packageName);
    }

    return enableSharedPackage(root, packageName, options);
}

export function disableSharedPackage(root, packageName) {
    const module = normalizeSharedPackage(root, packageName);
    const state = readState(root);
    const consolePackage = readPackageJson(root, path.join('console', 'package.json'));
    const workspace = readWorkspace(root);
    const sharedState = state.shared[module.frontend] ?? {};
    const workspacePath = workspacePathForPackage(module.dir);

    if (consolePackage.dependencies?.[module.frontend]) {
        consolePackage.dependencies[module.frontend] = sharedState.originalRange ?? packageVersionRange(readJson(path.join(module.dir, 'package.json'), null));
    }

    if (workspace.overrides?.[module.frontend]) {
        if (sharedState.originalOverride) {
            workspace.overrides[module.frontend] = sharedState.originalOverride;
        } else {
            delete workspace.overrides[module.frontend];
        }

        if (Object.keys(workspace.overrides).length === 0) {
            delete workspace.overrides;
        }
    }

    delete state.shared[module.frontend];
    removeWorkspaceEntry(workspace, workspacePath, state);

    writePackageJson(root, path.join('console', 'package.json'), consolePackage);
    writeWorkspace(root, workspace);
    writeState(root, state);

    return module;
}

export function disableSharedBackendPackage(root, packageName) {
    const module = normalizeSharedBackendPackage(root, packageName);
    const state = readState(root);
    const apiComposer = readPackageJson(root, path.join('api', 'composer.json'));
    const sharedState = state.shared[module.backend] ?? {};
    const repository = composerRepositoryFor(module.dir);
    const repositoryIndex = findRepositoryIndex(apiComposer, repository);

    if (apiComposer.require?.[module.backend]) {
        apiComposer.require[module.backend] = sharedState.originalRange ?? packageVersionRange(readJson(path.join(module.dir, 'composer.json'), null));
    }

    if (repositoryIndex >= 0) {
        if (sharedState.originalRepository) {
            apiComposer.repositories[repositoryIndex] = sharedState.originalRepository;
        } else {
            apiComposer.repositories.splice(repositoryIndex, 1);
        }
    }

    delete state.shared[module.backend];

    writePackageJson(root, path.join('api', 'composer.json'), apiComposer);
    writeState(root, state);

    return module;
}

export function disableSharedDependency(root, packageName) {
    if (isSharedBackendPackageName(root, packageName)) {
        return disableSharedBackendPackage(root, packageName);
    }

    return disableSharedPackage(root, packageName);
}

function isFrontendSharedLinked(shared) {
    return Boolean(shared.type === 'frontend' && (shared.stateTracked || shared.npmRange?.startsWith('workspace:') || shared.npmRange?.startsWith('link:') || shared.override?.startsWith('workspace:') || shared.override?.startsWith('link:')));
}

function isBackendSharedLinked(shared) {
    return Boolean(shared.type === 'backend' && (shared.stateTracked || shared.composerLinked));
}

export function getResetTargets(root = DEFAULT_ROOT) {
    const status = getStatus(root);
    const modules = status.modules.filter((module) => module.npmLinked || module.composerLinked || module.workspaceLinked || module.stateTracked);
    const shared = status.shared.filter((entry) => isFrontendSharedLinked(entry) || isBackendSharedLinked(entry));

    return {
        modules,
        shared,
    };
}

export function resetLinks(root = DEFAULT_ROOT) {
    const targets = getResetTargets(root);
    const resetModules = [];

    for (const module of targets.modules) {
        resetModules.push(disableModule(root, module.slug));
    }

    for (const shared of targets.shared) {
        resetModules.push(disableSharedDependency(root, shared.packageName));
    }

    removeEmptyState(root);

    return resetModules;
}

function readLockfileVersions(root) {
    const lockfile = readText(path.join(root, 'console', 'pnpm-lock.yaml'), '');
    const versions = new Map();
    const regex = /^\s{2}'?(@fleetbase\/[^'@:\s]+)@([^':\s]+)[^']*'?:/gm;
    let match;

    while ((match = regex.exec(lockfile))) {
        const [, packageName, version] = match;
        const normalizedVersion = version.split('(')[0];
        if (!versions.has(packageName)) {
            versions.set(packageName, new Set());
        }
        versions.get(packageName).add(normalizedVersion);
    }

    return versions;
}

function symlinkTarget(root, packageName) {
    const packagePath = path.join(root, 'console', 'node_modules', ...packageName.split('/'));

    try {
        const stats = fs.lstatSync(packagePath);
        return stats.isSymbolicLink() ? fs.readlinkSync(packagePath) : null;
    } catch {
        return null;
    }
}

function resolvePackageFrom(baseDir, packageName) {
    try {
        return require.resolve(`${packageName}/package.json`, { paths: [baseDir] });
    } catch {
        return null;
    }
}

function isResolvedFromWorkspace(root, resolvedPackageJsonPath, workspacePath) {
    if (!resolvedPackageJsonPath || !workspacePath) {
        return false;
    }

    const expectedPackageDir = path.resolve(root, 'console', workspacePath);
    const resolvedPackageDir = path.dirname(resolvedPackageJsonPath);
    const relativePath = path.relative(expectedPackageDir, resolvedPackageDir);

    return relativePath === '' || (!relativePath.startsWith('..') && !path.isAbsolute(relativePath));
}

export function getStatus(root = DEFAULT_ROOT) {
    const modules = discoverModules(root);
    const packages = discoverPackages(root);
    const backendSharedPackages = discoverSharedBackendDependencies(root);
    const state = readState(root);
    const consolePackage = readJson(path.join(root, 'console', 'package.json'), {});
    const apiComposer = readJson(path.join(root, 'api', 'composer.json'), {});
    const workspace = readWorkspace(root);

    return {
        modules: modules.map((module) => {
            const npmRange = module.frontend ? consolePackage.dependencies?.[module.frontend] : null;
            const composerRange = module.backend ? apiComposer.require?.[module.backend] : null;
            const repository = module.backend ? (apiComposer.repositories ?? []).find((candidate) => candidate.type === 'path' && candidate.url === workspacePathForPackage(module.dir)) : null;

            return {
                ...module,
                npmLinked: Boolean(npmRange?.startsWith('link:')),
                npmRange,
                composerLinked: Boolean(repository),
                composerRange,
                workspaceLinked: Boolean((workspace.packages ?? []).includes(workspacePathForPackage(module.dir))),
                stateTracked: Boolean(state.modules[module.slug]),
            };
        }),
        shared: [
            ...DEFAULT_SHARED_PACKAGES.map((packageName) => {
                const module = packages.find((candidate) => candidate.frontend === packageName);
                return {
                    type: 'frontend',
                    packageName,
                    workspacePath: module ? workspacePathForPackage(module.dir) : null,
                    npmRange: consolePackage.dependencies?.[packageName] ?? null,
                    override: workspace.overrides?.[packageName] ?? consolePackage.pnpm?.overrides?.[packageName] ?? null,
                    stateTracked: Boolean(state.shared[packageName]),
                    symlinkTarget: symlinkTarget(root, packageName),
                };
            }),
            ...backendSharedPackages.map((module) => {
                const repository = (apiComposer.repositories ?? []).find((candidate) => candidate.type === 'path' && candidate.url === workspacePathForPackage(module.dir));
                return {
                    type: 'backend',
                    packageName: module.backend,
                    composerRange: apiComposer.require?.[module.backend] ?? null,
                    composerLinked: Boolean(repository),
                    stateTracked: Boolean(state.shared[module.backend]),
                    module,
                };
            }),
        ],
    };
}

function printList(root) {
    const modules = discoverModules(root);
    const sharedDependencies = discoverSharedDependencies(root);
    const sharedBackendDependencies = discoverSharedBackendDependencies(root);

    console.log('Extensions');
    for (const module of modules) {
        const source = module.extension ? 'extension.json' : 'package.json keywords';
        console.log(`  ${module.slug.padEnd(22)} frontend=${module.frontend ?? '-'} backend=${module.backend ?? '-'} source=${source}`);
    }

    console.log('\nShared development dependencies');
    for (const module of sharedDependencies) {
        console.log(`  ${module.slug.padEnd(22)} frontend=${module.frontend}`);
    }
    for (const module of sharedBackendDependencies) {
        console.log(`  ${module.slug.padEnd(22)} backend=${module.backend}`);
    }
}

function printStatus(root) {
    const status = getStatus(root);

    console.log('Modules');
    for (const module of status.modules.filter((candidate) => candidate.npmLinked || candidate.composerLinked || candidate.workspaceLinked || candidate.stateTracked)) {
        console.log(`  ${module.slug}: npm=${module.npmRange ?? '-'} composer=${module.composerLinked ? 'path' : '-'} workspace=${module.workspaceLinked ? 'yes' : 'no'} state=${module.stateTracked ? 'yes' : 'no'}`);
    }

    console.log('\nShared packages');
    for (const shared of status.shared) {
        if (shared.type === 'backend') {
            console.log(`  ${shared.packageName}: composer=${shared.composerRange ?? '-'} path=${shared.composerLinked ? 'yes' : 'no'} state=${shared.stateTracked ? 'yes' : 'no'}`);
        } else {
            console.log(`  ${shared.packageName}: dep=${shared.npmRange ?? '-'} override=${shared.override ?? '-'} symlink=${shared.symlinkTarget ?? '-'}`);
        }
    }
}

function printDoctor(root) {
    const status = getStatus(root);
    const versions = readLockfileVersions(root);
    const configuredSharedPackages = status.shared.filter((entry) => entry.type === 'frontend' && (entry.override?.startsWith('workspace:') || entry.npmRange?.startsWith('workspace:') || entry.npmRange?.startsWith('link:')));
    const configuredSharedBackendPackages = status.shared.filter((entry) => entry.type === 'backend' && (entry.composerLinked || entry.stateTracked));
    const activeModules = status.modules.filter((module) => module.npmLinked || module.composerLinked || module.workspaceLinked || module.stateTracked);
    let issues = 0;

    printStatus(root);
    console.log('\nDoctor');

    for (const shared of configuredSharedPackages) {
        const resolvedFromConsole = resolvePackageFrom(path.join(root, 'console'), shared.packageName);
        const ok = isResolvedFromWorkspace(root, resolvedFromConsole, shared.workspacePath);
        if (ok) {
            console.log(`  ok ${shared.packageName} resolves to ${resolvedFromConsole}`);
        } else {
            issues++;
            console.log(`  warn ${shared.packageName} is configured for local development but node_modules does not point at ${shared.workspacePath}. Run: cd console && pnpm install`);
        }
    }

    for (const module of activeModules) {
        const packageJson = readJson(path.join(module.dir, 'package.json'), null);
        const moduleSharedDeps = DEFAULT_SHARED_PACKAGES.filter((packageName) => packageJson?.dependencies?.[packageName] && configuredSharedPackages.some((shared) => shared.packageName === packageName));

        for (const packageName of moduleSharedDeps) {
            const resolvedFromModule = resolvePackageFrom(module.dir, packageName);
            const shared = configuredSharedPackages.find((entry) => entry.packageName === packageName);
            const ok = isResolvedFromWorkspace(root, resolvedFromModule, shared.workspacePath);

            if (ok) {
                console.log(`  ok ${module.slug} resolves ${packageName} to ${resolvedFromModule}`);
            } else {
                issues++;
                console.log(`  warn ${module.slug} cannot resolve local ${packageName}. Run: flb-package-linker install ${module.slug}`);
            }
        }
    }

    for (const shared of configuredSharedBackendPackages) {
        if (shared.composerLinked) {
            console.log(`  ok ${shared.packageName} uses a Composer path repository`);
        } else {
            issues++;
            console.log(`  warn ${shared.packageName} is tracked for local development but api/composer.json does not have a path repository. Run: flb-package-linker enable-shared ${shared.module.slug}`);
        }
    }

    for (const [packageName, packageVersions] of versions.entries()) {
        if (packageVersions.size > 1) {
            issues++;
            console.log(`  warn ${packageName} has duplicate lockfile versions: ${[...packageVersions].join(', ')}`);
        }
    }

    if (issues === 0) {
        console.log('  ok no duplicate Fleetbase package versions or missing local links detected');
    }
}

function printFollowUp(modules = []) {
    const normalizedModules = Array.isArray(modules) ? modules : [modules].filter(Boolean);

    console.log('\nNext steps:');
    for (const command of getInstallCommands(normalizedModules)) {
        console.log(`  ${command}`);
    }

    const moduleNames = normalizedModules.map((module) => module?.slug).filter(Boolean);
    console.log(`  flb-package-linker install${moduleNames.length > 0 ? ` ${moduleNames.join(' ')}` : ''}`);
}

function copyIfExists(source, destination) {
    if (!fs.existsSync(source)) {
        return;
    }

    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(source, destination);
}

function createDryRunRoot(root) {
    const dryRunRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'package-linker-dry-run-'));

    for (const relativePath of ['console/package.json', 'console/pnpm-workspace.yaml', 'console/.npmrc', 'api/composer.json', STATE_FILE]) {
        copyIfExists(path.join(root, relativePath), path.join(dryRunRoot, relativePath));
    }

    for (const module of discoverPackages(root)) {
        const packageDir = path.join(dryRunRoot, 'packages', module.slug);
        copyIfExists(path.join(module.dir, 'package.json'), path.join(packageDir, 'package.json'));
        copyIfExists(path.join(module.dir, 'composer.json'), path.join(packageDir, 'composer.json'));
        copyIfExists(path.join(module.dir, 'extension.json'), path.join(packageDir, 'extension.json'));
    }

    return dryRunRoot;
}

function collectManifestSnapshots(root) {
    const files = ['console/package.json', 'console/pnpm-workspace.yaml', 'console/.npmrc', 'api/composer.json', STATE_FILE];
    const snapshots = {};

    for (const file of files) {
        snapshots[file] = readText(path.join(root, file), null);
    }

    return snapshots;
}

function printDryRunDiff(originalRoot, dryRunRoot) {
    const original = collectManifestSnapshots(originalRoot);
    const next = collectManifestSnapshots(dryRunRoot);
    const changed = Object.keys(next).filter((file) => original[file] !== next[file]);

    if (changed.length === 0) {
        console.log('Dry run: no manifest changes.');
        return;
    }

    console.log('Dry run: would update:');
    for (const file of changed) {
        console.log(`  ${file}`);
    }

    console.log('\nPreview:');
    for (const file of changed) {
        console.log(`\n--- ${file}`);
        if (file === 'console/.npmrc') {
            console.log('(redacted; registry auth is preserved, non-auth pnpm settings may move to pnpm-workspace.yaml)');
            continue;
        }
        console.log(next[file]?.trimEnd() ?? '(deleted)');
    }
}

export function getInstallCommands(modules = []) {
    const normalizedModules = Array.isArray(modules) ? modules : [modules].filter(Boolean);
    const backendPackages = unique(normalizedModules.map((module) => module?.backend).filter(Boolean));
    const commands = ['cd console && pnpm install'];

    if (backendPackages.length > 0) {
        commands.push(`cd api && composer update ${backendPackages.join(' ')} --with-dependencies`);
    }

    return commands;
}

export function getInstallModules(root, moduleNames = []) {
    if (moduleNames.length > 0) {
        return moduleNames.map((moduleName) => {
            if (isSharedBackendPackageName(root, moduleName)) {
                return normalizeSharedBackendPackage(root, moduleName);
            }

            return findModule(root, moduleName);
        });
    }

    const status = getStatus(root);
    const linkedModuleNames = status.modules.filter((module) => module.npmLinked || module.composerLinked || module.workspaceLinked || module.stateTracked).map((module) => module.slug);
    const linkedBackendSharedModules = status.shared
        .filter((entry) => entry.type === 'backend' && (entry.composerLinked || entry.stateTracked))
        .map((entry) => entry.module);

    return [...unique(linkedModuleNames).map((moduleName) => findModule(root, moduleName)), ...linkedBackendSharedModules];
}

function printInstallPlan(modules = []) {
    console.log('Install commands:');
    for (const command of getInstallCommands(modules)) {
        console.log(`  ${command}`);
    }
}

function runInstall(root, modules = []) {
    const normalizedModules = Array.isArray(modules) ? modules : [modules].filter(Boolean);
    const backendPackages = unique(normalizedModules.map((module) => module?.backend).filter(Boolean));
    const pnpm = spawnSync('pnpm', ['install'], {
        cwd: path.join(root, 'console'),
        stdio: 'inherit',
    });

    if (pnpm.status !== 0) {
        process.exit(pnpm.status ?? 1);
    }

    if (backendPackages.length > 0) {
        const composer = spawnSync('composer', ['update', ...backendPackages, '--with-dependencies'], {
            cwd: path.join(root, 'api'),
            stdio: 'inherit',
        });

        if (composer.status !== 0) {
            process.exit(composer.status ?? 1);
        }
    }
}

function parseArgs(argv) {
    const args = [...argv];
    let root = DEFAULT_ROOT;
    let install = false;
    let dryRun = false;
    const shared = [];
    const positional = [];

    while (args.length > 0) {
        const arg = args.shift();

        if (arg === '--root') {
            root = path.resolve(args.shift());
            continue;
        }

        if (arg === '--install') {
            install = true;
            continue;
        }

        if (arg === '--dry-run') {
            dryRun = true;
            continue;
        }

        if (arg === '--shared') {
            while (args[0] && !args[0].startsWith('--')) {
                shared.push(args.shift());
            }
            continue;
        }

        positional.push(arg);
    }

    return {
        root,
        install,
        dryRun,
        shared,
        command: positional[0],
        values: positional.slice(1),
    };
}

export function runCli(argv = process.argv.slice(2)) {
    const { root, command, values, shared, install, dryRun } = parseArgs(argv);
    const targetRoot = dryRun ? createDryRunRoot(root) : root;

    if (!command || command === '--help' || command === '-h') {
        console.log(usage());
        return;
    }

    if (command === 'list') {
        printList(root);
        return;
    }

    if (command === 'status') {
        printStatus(root);
        return;
    }

    if (command === 'doctor') {
        printDoctor(root);
        return;
    }

    if (command === 'install' || command === 'sync') {
        const modules = getInstallModules(root, values);

        if (dryRun) {
            printInstallPlan(modules);
        } else {
            runInstall(root, modules);
        }
        return;
    }

    if (command === 'reset') {
        const modules = resetLinks(targetRoot);

        if (modules.length === 0) {
            console.log('No local development links found.');
        } else {
            console.log(`Reset ${modules.length} local development link${modules.length === 1 ? '' : 's'}.`);
        }

        if (dryRun) {
            printDryRunDiff(root, targetRoot);
        } else {
            install ? runInstall(root, modules) : printFollowUp(modules);
        }
        return;
    }

    if (command === 'enable') {
        if (!values[0]) {
            throw new Error('Missing module name for enable.');
        }

        const modules = values.map((moduleName) => enableModule(targetRoot, moduleName, { shared }));
        for (const module of modules) {
            console.log(`Enabled local development links for ${module.slug}.`);
        }
        if (dryRun) {
            printDryRunDiff(root, targetRoot);
        } else {
            install ? runInstall(root, modules) : printFollowUp(modules);
        }
        return;
    }

    if (command === 'disable') {
        if (!values[0]) {
            throw new Error('Missing module name for disable.');
        }

        const modules = values.map((moduleName) => disableModule(targetRoot, moduleName));
        for (const module of modules) {
            console.log(`Disabled local development links for ${module.slug}.`);
        }
        dryRun ? printDryRunDiff(root, targetRoot) : printFollowUp(modules);
        return;
    }

    if (command === 'enable-shared') {
        if (values.length === 0) {
            throw new Error('Missing shared package name.');
        }

        const modules = [];
        for (const packageName of values) {
            const module = enableSharedDependency(targetRoot, packageName);
            modules.push(module);
            console.log(`Enabled shared package ${module.frontend ?? module.backend}.`);
        }

        if (dryRun) {
            printDryRunDiff(root, targetRoot);
        } else {
            install ? runInstall(root, modules) : printFollowUp(modules);
        }
        return;
    }

    if (command === 'disable-shared') {
        if (values.length === 0) {
            throw new Error('Missing shared package name.');
        }

        const modules = [];
        for (const packageName of values) {
            const module = disableSharedDependency(targetRoot, packageName);
            modules.push(module);
            console.log(`Disabled shared package ${module.frontend ?? module.backend}.`);
        }

        dryRun ? printDryRunDiff(root, targetRoot) : printFollowUp(modules);
        return;
    }

    throw new Error(`Unknown command "${command}".\n\n${usage()}`);
}

function isEntrypoint() {
    if (!process.argv[1]) {
        return false;
    }

    try {
        return fs.realpathSync(process.argv[1]) === fs.realpathSync(__filename);
    } catch {
        return import.meta.url === pathToFileURL(process.argv[1]).href;
    }
}

if (isEntrypoint()) {
    try {
        runCli();
    } catch (error) {
        console.error(error.message);
        process.exit(1);
    }
}

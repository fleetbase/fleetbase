import Pretender from 'pretender';
import { visit, currentRouteName } from '@ember/test-helpers';

/**
 * A stand-in Fleetbase API for acceptance tests, so the real console can boot,
 * sign in and mount engines with no backend.
 *
 * Every request goes through Pretender (it also replaces `fetch` while it runs).
 * Same-origin static files the boot reads (`fleetbase.config.json`,
 * `extensions.json`, assets) pass through to the test server. Everything else,
 * whatever host the runtime config picked, is answered here: the session,
 * the signed-in admin and their brand, an empty dashboard for any extension,
 * and an empty, successful reply for the rest. `this.backend.requests` lists
 * what the app asked for, which is the first thing to read when a test fails.
 *
 * Call it before `setupApplicationTest(hooks)`: application tests boot the app
 * in their own `beforeEach`, and the boot already makes requests.
 */
export const TEST_USER = Object.freeze({
    id: 'user-1',
    uuid: 'user-1',
    public_id: 'user_test',
    company_uuid: 'company-1',
    company_name: 'Acme Logistics',
    name: 'Test Admin',
    email: 'admin@example.test',
    type: 'admin',
    role_name: 'Administrator',
    status: 'active',
    locale: 'en-us',
    timezone: 'UTC',
    is_admin: true,
    company_onboarding_completed: true,
    two_factor_enabled: false,
    email_verified_at: '2026-01-01T00:00:00.000Z',
    permissions: [],
    policies: [],
    // Required: currentUser.getUserSnapshot() serializes the role, and real users always carry one embedded.
    role: Object.freeze({ id: 'role-1', uuid: 'role-1', name: 'Administrator', guard_name: 'sanctum', company_uuid: 'company-1', permissions: [], policies: [] }),
});

export const TEST_TOKEN = 'test-token';

const STATIC_FILE = /\.(json|js|css|map|png|svg|jpg|woff2?|ttf)(\?|$)/;

function json(status, body) {
    return [status, { 'Content-Type': 'application/json' }, JSON.stringify(body)];
}

function parseBody(request) {
    try {
        return request.requestBody ? JSON.parse(request.requestBody) : {};
    } catch {
        return {};
    }
}

/** The API path without host, query string and namespace: `int/v1/users/me` → `users/me`. */
export function apiPath(url) {
    let path = String(url);
    path = path.replace(/^[a-z]+:\/\/[^/]+/i, '');
    path = path.split('?')[0];
    path = path.replace(/^\/+/, '');
    path = path.replace(/^int\/v\d+\//, '');
    return path;
}

function queryOf(url) {
    const index = String(url).indexOf('?');
    return new URLSearchParams(index === -1 ? '' : String(url).slice(index + 1));
}

/**
 * The reply for one request. Exported so a test can see what the stub would
 * answer; `routes` (from the test) win over the defaults.
 */
export function replyFor(verb, url, request, routes = {}) {
    const path = apiPath(url);
    const key = `${verb} ${path}`;

    if (typeof routes[key] === 'function') {
        return json(200, routes[key](request));
    }

    if (key === 'GET auth/session') {
        return json(200, { token: TEST_TOKEN, user: TEST_USER.id, type: 'user' });
    }

    if (key === 'GET users/me') {
        return json(200, { user: { ...TEST_USER, role: { ...TEST_USER.role } } });
    }

    if (key === 'GET users/locale') {
        return json(200, { locale: 'en-us' });
    }

    if (key === 'GET auth/organizations') {
        return json(200, []);
    }

    if (/^GET brands\/[^/]+$/.test(key)) {
        return json(200, { brand: { id: '1', uuid: '1' } });
    }

    if (key === 'GET dashboards') {
        const extension = queryOf(url).get('extension') || 'core';
        return json(200, {
            dashboards: [{ id: `dashboard-${extension}`, uuid: `dashboard-${extension}`, name: 'Test dashboard', extension, is_default: true, user_uuid: TEST_USER.id, widgets: [] }],
        });
    }

    if (verb === 'GET') {
        // A collection: `{ <last segment>: [] }` is an empty ember-data payload and harmless to fetch() callers.
        const last = path.split('/').pop();
        return json(200, last && last.endsWith('s') ? { [last]: [] } : {});
    }

    if (verb === 'POST' || verb === 'PUT' || verb === 'PATCH') {
        // An ember-data save sends `{ <type>: {...} }`: echo it back with an id.
        const body = parseBody(request);
        const keys = Object.keys(body);
        if (keys.length === 1 && body[keys[0]] && typeof body[keys[0]] === 'object' && !Array.isArray(body[keys[0]])) {
            const record = body[keys[0]];
            const id = record.id || record.uuid || `${keys[0]}-1`;
            return json(200, { [keys[0]]: { ...record, id, uuid: id } });
        }
        return json(200, {});
    }

    return [204, {}, ''];
}

export function setupConsoleBackend(hooks, { routes = {} } = {}) {
    hooks.beforeEach(function () {
        const requests = [];
        const server = new Pretender(function () {
            for (const verb of ['get', 'head']) {
                this[verb]('/assets/*path', this.passthrough);
                this[verb]('/engines-dist/*path', this.passthrough);
                this[verb]('/fleetbase.config.json', this.passthrough);
                this[verb]('/extensions.json', this.passthrough);
            }
        });

        server.unhandledRequest = (verb, url, request) => {
            if (verb === 'GET' && url.startsWith('/') && STATIC_FILE.test(url) && !/\/int\/v\d+\//.test(url)) {
                // A same-origin file the passthrough list does not name: answer as a missing file, like the test server would.
                requests.push(`${verb} ${url} (static)`);
                request.respond(404, {}, '');
                return;
            }

            requests.push(`${verb} ${url}`);
            const [status, headers, body] = replyFor(verb, url, request, routes);
            request.respond(status, headers, body);
        };
        server.handledRequest = () => {};
        server.passthroughRequest = () => {};

        this.backend = { server, requests };
    });

    hooks.afterEach(function () {
        this.backend?.server.shutdown();
        this.backend = null;
    });
}

function describe(error) {
    if (!error) {
        return String(error);
    }
    const stack = (error.stack || '').split('\n').slice(0, 4).join(' | ');
    return `${error.name || 'Error'}: ${error.message || JSON.stringify(error)}${stack ? ` [${stack}]` : ''}`;
}

/**
 * Records why a signed-in boot gave up: the console route aborts the transition
 * when loading the current user fails, which surfaces in `visit()` as a bare
 * `TransitionAborted`.
 */
function captureBootErrors(owner, log) {
    const currentUser = owner.lookup('service:current-user');
    const promiseUser = currentUser.promiseUser.bind(currentUser);
    currentUser.promiseUser = async (...args) => {
        try {
            return await promiseUser(...args);
        } catch (error) {
            log.push(`promiseUser failed: ${describe(error)}`);
            throw error;
        }
    };

    const session = owner.lookup('service:session');
    const invalidateWithLoader = session.invalidateWithLoader.bind(session);
    session.invalidateWithLoader = (...args) => {
        log.push(`session invalidated: ${args[0]}`);
        return invalidateWithLoader(...args);
    };

    const router = owner.lookup('service:router');
    router.on('routeWillChange', (transition) => log.push(`→ ${transition.to?.name}`));
}

/**
 * Signs the test admin in. The session restores through `auth/session` when the
 * application route calls `session.setup()`, exactly as a reload would.
 */
export async function signIn(owner, context) {
    if (context?.backend) {
        context.backend.boot = [];
        captureBootErrors(owner, context.backend.boot);
    }

    const session = owner.lookup('service:session');
    await session.session._setup('authenticator:fleetbase', { token: TEST_TOKEN, user: TEST_USER.id }, false);
}

/** `visit()`, but a failed boot says why: the route reached, the boot log and every request. */
export async function visitConsole(context, url) {
    try {
        await visit(url);
    } catch (error) {
        const route = (() => {
            try {
                return currentRouteName();
            } catch {
                return '(none)';
            }
        })();
        throw new Error(
            `visit(${url}) failed: ${describe(error)} — route: ${route} — boot: ${(context.backend?.boot || []).join(' ; ')} — requests: ${(context.backend?.requests || []).join(', ')}`
        );
    }
}

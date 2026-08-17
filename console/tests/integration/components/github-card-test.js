import { module, test } from 'qunit';
import { setupRenderingTest } from '@fleetbase/console/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import { _resetStorages } from 'ember-local-storage/helpers/storage';
import { add } from 'date-fns';
import GithubCardComponent from '@fleetbase/console/components/github-card';
import { captureComponent } from '@fleetbase/console/tests/helpers/capture-component';

// Matches config/environment.js: namespace '@fleetbase' + keyDelimiter '/'.
const LOCAL_CACHE_KEY = '@fleetbase/storage:local-cache';

module('Integration | Component | github-card', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        // storageFor() memoizes its buckets in a module-level cache that outlives the
        // per-test container, so reset it and seed localStorage directly — the bucket
        // hydrates from localStorage when the component first builds it. A live cache
        // entry keeps the component from calling the real GitHub API.
        _resetStorages();
        window.localStorage.clear();

        const notExpired = add(new Date(), { hours: 6 }).toISOString();
        window.localStorage.setItem(
            LOCAL_CACHE_KEY,
            JSON.stringify({
                'fleetbase-github-data': {
                    full_name: 'fleetbase/fleetbase',
                    html_url: 'https://github.com/fleetbase/fleetbase',
                    owner: { avatar_url: '/images/fleetbase-logo-svg.svg' },
                },
                'fleetbase-github-data-expiration': notExpired,
                'fleetbase-github-tags': [{ name: 'v0.7.53' }],
                'fleetbase-github-tags-expiration': notExpired,
            })
        );
    });

    hooks.afterEach(function () {
        _resetStorages();
        window.localStorage.clear();
    });

    test('it renders the repository card from cached data', async function (assert) {
        await render(hbs`<GithubCard />`);

        assert.dom('.fleetbase-github-card').exists('the card renders');
        assert.dom(this.element).containsText('fleetbase/fleetbase');
    });

    test('it shows the latest cached release tag', async function (assert) {
        await render(hbs`<GithubCard />`);

        assert.dom(this.element).containsText('v0.7.53');
    });
});

/**
 * With no live cache the component goes to the GitHub API. ember-fetch delegates to
 * window.fetch in the browser, so swapping that keeps the tests offline and lets the
 * cache-miss branches be driven.
 */
module('Integration | Component | github-card | fetching', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        _resetStorages();
        window.localStorage.clear();

        this.requested = [];
        // The component imports `fetch` from ember-fetch, which binds self.fetch when the
        // module first evaluates -- swapping window.fetch afterwards has no effect. Babel's
        // AMD interop reads `.default` off the module at each call site, so replace that.
        this.fetchModule = window.require('fetch');
        this.originalFetch = this.fetchModule.default;
        this.responses = {
            'https://api.github.com/repos/fleetbase/fleetbase': { ok: true, body: { full_name: 'fleetbase/fleetbase' } },
            'https://api.github.com/repos/fleetbase/fleetbase/tags': { ok: true, body: [{ name: 'v9.9.9' }] },
        };

        this.fetchModule.default = (url) => {
            this.requested.push(url);
            const response = this.responses[url] ?? { ok: false, body: null };

            return Promise.resolve({
                ok: response.ok,
                json: () => Promise.resolve(response.body),
            });
        };
    });

    hooks.afterEach(function () {
        this.fetchModule.default = this.originalFetch;
        _resetStorages();
        window.localStorage.clear();
    });

    test('an empty cache fetches the repository and its tags, then caches both', async function (assert) {
        await render(hbs`<GithubCard />`);

        assert.deepEqual(this.requested.slice().sort(), ['https://api.github.com/repos/fleetbase/fleetbase', 'https://api.github.com/repos/fleetbase/fleetbase/tags']);
        assert.dom(this.element).containsText('fleetbase/fleetbase');
        assert.dom(this.element).containsText('v9.9.9');

        const cache = JSON.parse(window.localStorage.getItem(LOCAL_CACHE_KEY));
        assert.deepEqual(cache['fleetbase-github-data'], { full_name: 'fleetbase/fleetbase' }, 'the repository is cached');
        assert.deepEqual(cache['fleetbase-github-tags'], [{ name: 'v9.9.9' }], 'the tags are cached');
        assert.ok(cache['fleetbase-github-data-expiration'], 'with an expiry stamp');
        assert.ok(cache['fleetbase-github-tags-expiration']);
    });

    test('an expired cache is refetched rather than reused', async function (assert) {
        const expired = add(new Date(), { hours: -1 }).toISOString();
        window.localStorage.setItem(
            LOCAL_CACHE_KEY,
            JSON.stringify({
                'fleetbase-github-data': { full_name: 'stale/repo' },
                'fleetbase-github-data-expiration': expired,
                'fleetbase-github-tags': [{ name: 'v0.0.0-stale' }],
                'fleetbase-github-tags-expiration': expired,
            })
        );
        _resetStorages();

        await render(hbs`<GithubCard />`);

        assert.strictEqual(this.requested.length, 2, 'both endpoints are refetched');
        assert.dom(this.element).containsText('fleetbase/fleetbase');
        assert.dom(this.element).doesNotContainText('stale/repo');
    });

    test('a failed response leaves the built-in defaults in place', async function (assert) {
        this.responses = {};

        await render(hbs`<GithubCard />`);

        assert.strictEqual(this.requested.length, 2, 'both endpoints were attempted');
        assert.dom('.fleetbase-github-card').exists('the card still renders');
        // latestRelease falls back to v0.0.1 when no tags were loaded.
        assert.dom(this.element).containsText('v0.0.1', 'the placeholder release is shown');
    });

    test('the release link points at the tag when one is known', async function (assert) {
        const captured = captureComponent(this.owner, 'github-card', GithubCardComponent);

        await render(hbs`<GithubCard />`);
        const component = captured.instance;

        assert.deepEqual(component.latestRelease, { name: 'v9.9.9' }, 'the first tag is the latest release');
        assert.strictEqual(component.releaseUrl, 'https://github.com/fleetbase/fleetbase/releases/tag/v9.9.9');

        component.tags = [];
        assert.deepEqual(component.latestRelease, { name: 'v0.0.1' }, 'with no tags a placeholder release is used');
        assert.strictEqual(component.releaseUrl, 'https://github.com/fleetbase/fleetbase/releases/tag/v0.0.1');
    });

    test('the release link drops the tag segment when the release has no name', async function (assert) {
        const captured = captureComponent(this.owner, 'github-card', GithubCardComponent);

        await render(hbs`<GithubCard />`);
        const component = captured.instance;

        component.tags = [{ name: '' }];

        assert.strictEqual(component.releaseUrl, 'https://github.com/fleetbase/fleetbase/releases', 'a blank tag name leaves the plain releases URL');
    });
});

/**
 * Both tasks guard against writing tracked state after teardown. Driving that means
 * holding the request open, tearing the component down, and only then resolving it.
 */
module('Integration | Component | github-card | teardown', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        _resetStorages();
        window.localStorage.clear();

        this.fetchModule = window.require('fetch');
        this.originalFetch = this.fetchModule.default;
    });

    hooks.afterEach(function () {
        this.fetchModule.default = this.originalFetch;
        _resetStorages();
        window.localStorage.clear();
    });

    test('a response arriving after teardown is ignored', async function (assert) {
        const captured = captureComponent(this.owner, 'github-card', GithubCardComponent);
        const pending = [];

        this.fetchModule.default = () =>
            new Promise((resolve) => {
                pending.push(resolve);
            });

        // Park both requests so the component builds but neither task can finish. render()
        // waits on them, so do not await it until the responses are released.
        const rendering = render(hbs`<GithubCard />`);
        while (!captured.instance) {
            await new Promise((resolve) => setTimeout(resolve, 0));
        }

        const component = captured.instance;
        // Flag the component as tearing down. Actually calling clearRender() cannot work
        // here: it waits for settled, which the parked tasks would block forever.
        Object.defineProperty(component, 'isDestroying', { configurable: true, value: true });

        pending.forEach((resolve) => resolve({ ok: true, json: () => Promise.resolve({ full_name: 'late/response' }) }));
        await rendering;

        assert.strictEqual(pending.length, 2, 'both requests were in flight');
        assert.notStrictEqual(component.data?.full_name, 'late/response', 'the late repository response is dropped');
        assert.deepEqual(component.tags, [], 'and the late tags response is dropped too');
    });
});

import { module, test } from 'qunit';
import { setupRenderingTest } from '@fleetbase/console/tests/helpers';
import Service from '@ember/service';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import { _resetStorages } from 'ember-local-storage/helpers/storage';
import FleetbaseBlogComponent from '@fleetbase/console/components/fleetbase-blog';
import { captureComponent } from '@fleetbase/console/tests/helpers/capture-component';

module('Integration | Component | fleetbase-blog', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        // storageFor() memoizes its buckets in a module-level cache, so the 'local-cache'
        // object is shared by every test container and outlives the one that created it.
        // Left alone, the first test's cached posts get served to the second, and touching
        // the stale object throws "Cannot create a new tag ... after it has been destroyed".
        // _resetStorages() drops that memo so each test builds its own bucket.
        _resetStorages();
        window.localStorage.clear();

        class FetchStub extends Service {
            response = [];
            requests = [];

            get(url) {
                this.requests.push(url);

                return Promise.resolve(this.response);
            }
        }

        this.owner.register('service:fetch', FetchStub);
    });

    test('it renders blog posts from the lookup endpoint', async function (assert) {
        const fetch = this.owner.lookup('service:fetch');

        fetch.response = [
            {
                title: 'First Ghost Post',
                link: 'https://www.fleetbase.io/blog/first-ghost-post',
                pubDate: 'Wed, 06 May 2026 14:31:46 GMT',
            },
            {
                title: 'Second Ghost Post',
                link: 'https://www.fleetbase.io/blog/second-ghost-post',
                pubDate: 'Wed, 06 May 2026 14:30:46 GMT',
            },
        ];

        await render(hbs`<FleetbaseBlog />`);

        assert.deepEqual(fetch.requests, ['lookup/fleetbase-blog']);
        assert.dom('.fleetbase-blog').containsText('Fleetbase Blog');
        // Each post link renders the title and the formatted date side by side, so the
        // anchor's text is "<title> <date>" — match on containment, not equality.
        assert.dom('a[href="https://www.fleetbase.io/blog/first-ghost-post"]').containsText('First Ghost Post');
        assert.dom('a[href="https://www.fleetbase.io/blog/second-ghost-post"]').containsText('Second Ghost Post');
        // pubDate is rendered through formatPublishedDate as 'MMM d, yyyy', not raw.
        assert.dom('.fleetbase-blog').containsText('May 6, 2026');
    });

    test('it renders an empty state when no posts are available', async function (assert) {
        await render(hbs`<FleetbaseBlog />`);

        assert.dom('.fleetbase-blog').containsText('No blog posts are available right now.');
    });
});

/**
 * The blog falls back to the API when its local cache is empty or stale, and formats each
 * post's publish date defensively.
 */
module('Integration | Component | fleetbase-blog | loading', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        _resetStorages();
        window.localStorage.clear();

        this.getResponse = [{ title: 'Fleetbase 0.8', pubDate: '2026-01-15T00:00:00Z' }];
        this.getRejectsWith = null;
        const context = this;

        class FetchStub extends Service {
            async get() {
                if (context.getRejectsWith) {
                    throw context.getRejectsWith;
                }

                return context.getResponse;
            }
        }
        this.owner.register('service:fetch', FetchStub);

        const captured = captureComponent(this.owner, 'fleetbase-blog', FleetbaseBlogComponent);
        this.build = async () => {
            await render(hbs`<FleetbaseBlog />`);
            return captured.instance;
        };
    });

    hooks.afterEach(function () {
        _resetStorages();
        window.localStorage.clear();
    });

    test('an empty cache loads the posts and caches them', async function (assert) {
        const component = await this.build();

        assert.deepEqual(component.posts, this.getResponse);
        assert.deepEqual(component.localCache.get('fleetbase-blog-data'), this.getResponse, 'the posts are cached');
        assert.ok(component.localCache.get('fleetbase-blog-data-expiration'), 'with an expiry stamp');
    });

    test('a response that is not a list is treated as no posts', async function (assert) {
        this.getResponse = { error: 'unexpected' };
        const component = await this.build();

        assert.deepEqual(component.posts, [], 'nothing is rendered rather than a broken list');
    });

    test('a failed request leaves the blog empty without throwing', async function (assert) {
        this.getRejectsWith = new Error('blog feed unavailable');
        const component = await this.build();

        assert.deepEqual(component.posts, []);
    });

    test('formattedPosts renders each publish date defensively', async function (assert) {
        this.getResponse = [{ title: 'Dated', pubDate: '2026-01-15T00:00:00Z' }, { title: 'Undated' }, { title: 'Nonsense date', pubDate: 'not a date at all' }];
        const component = await this.build();

        const formatted = component.formattedPosts;
        assert.strictEqual(formatted.length, 3);
        assert.strictEqual(formatted[0].formattedDate, 'Jan 15, 2026', 'a real date is formatted');
        assert.strictEqual(formatted[1].formattedDate, '', 'a missing date renders as empty');
        assert.strictEqual(formatted[2].formattedDate, 'not a date at all', 'an unparseable date is passed through unchanged');
        assert.strictEqual(formatted[0].title, 'Dated', 'the rest of the post is preserved');
    });
});

/**
 * The blog caches its feed for six hours. These drive the cache-hit arm and the teardown
 * guard, neither of which the loading module above ever reaches.
 */
module('Integration | Component | fleetbase-blog | cache', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        _resetStorages();
        window.localStorage.clear();

        this.getResponse = [{ title: 'Cached Post', pubDate: '2026-01-15T00:00:00Z' }];
        this.requests = 0;
        this.release = null;
        this.park = false;
        const context = this;

        class FetchStub extends Service {
            get() {
                context.requests++;

                if (context.park) {
                    return new Promise((resolve) => (context.release = () => resolve(context.getResponse)));
                }

                return Promise.resolve(context.getResponse);
            }
        }
        this.owner.register('service:fetch', FetchStub);

        const captured = captureComponent(this.owner, 'fleetbase-blog', FleetbaseBlogComponent);
        this.build = async () => {
            await render(hbs`<FleetbaseBlog />`);
            return captured.instance;
        };
    });

    hooks.afterEach(function () {
        _resetStorages();
        window.localStorage.clear();
    });

    test('a second mount is served entirely from the cache', async function (assert) {
        const first = await this.build();
        assert.strictEqual(this.requests, 1, 'the first mount goes to the network');

        this.getResponse = [{ title: 'Should not be requested' }];
        const second = await this.build();

        assert.strictEqual(this.requests, 1, 'the second mount never calls the endpoint');
        assert.deepEqual(second.posts, first.localCache.get('fleetbase-blog-data'), 'it renders what was cached');
        assert.strictEqual(second.posts[0].title, 'Cached Post');
    });

    test('an expired cache is refetched', async function (assert) {
        const first = await this.build();
        first.localCache.set('fleetbase-blog-data-expiration', new Date('2020-01-01T00:00:00Z'));

        this.getResponse = [{ title: 'Fresh Post' }];
        const second = await this.build();

        assert.strictEqual(this.requests, 2, 'a stale stamp sends it back to the network');
        assert.strictEqual(second.posts[0].title, 'Fresh Post');
    });

    test('a cache holding something other than a list is refetched', async function (assert) {
        const first = await this.build();
        first.localCache.set('fleetbase-blog-data', { error: 'corrupted' });

        const second = await this.build();

        assert.strictEqual(this.requests, 2, 'a non-list cache entry is not trusted');
        assert.deepEqual(second.posts, this.getResponse);
    });

    test('an empty response is not cached', async function (assert) {
        this.getResponse = null;
        const component = await this.build();

        assert.deepEqual(component.posts, [], 'there is nothing to show');
        assert.strictEqual(component.localCache.get('fleetbase-blog-data'), undefined, 'and nothing is written to the cache');
    });

    test('a response arriving after teardown is dropped', async function (assert) {
        this.park = true;
        const component = await this.build();

        // Racing clearRender() does not work: it waits on settled(), which the parked
        // request blocks. Mark the component destroying instead, then let the response land.
        Object.defineProperty(component, 'isDestroying', { configurable: true, value: true });
        this.release();
        await component.loadBlogPosts.last;

        assert.deepEqual(component.posts, [], 'the tracked state is left alone');
        assert.strictEqual(component.localCache.get('fleetbase-blog-data'), undefined, 'and nothing is cached');
    });
});

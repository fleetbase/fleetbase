import { module, test } from 'qunit';
import { setupRenderingTest } from '@fleetbase/console/tests/helpers';
import Service from '@ember/service';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import { _resetStorages } from 'ember-local-storage/helpers/storage';

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

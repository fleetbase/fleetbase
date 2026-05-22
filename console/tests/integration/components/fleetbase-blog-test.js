import { module, test } from 'qunit';
import { setupRenderingTest } from '@fleetbase/console/tests/helpers';
import Service from '@ember/service';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | fleetbase-blog', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
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
        assert.dom('a[href="https://www.fleetbase.io/blog/first-ghost-post"]').hasText('First Ghost Post');
        assert.dom('a[href="https://www.fleetbase.io/blog/second-ghost-post"]').hasText('Second Ghost Post');
        assert.dom('.fleetbase-blog').containsText('Wed, 06 May 2026 14:31:46 GMT');
    });

    test('it renders an empty state when no posts are available', async function (assert) {
        await render(hbs`<FleetbaseBlog />`);

        assert.dom('.fleetbase-blog').containsText('No blog posts are available right now.');
    });
});

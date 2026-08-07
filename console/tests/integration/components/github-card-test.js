import { module, test } from 'qunit';
import { setupRenderingTest } from '@fleetbase/console/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import { _resetStorages } from 'ember-local-storage/helpers/storage';
import { add } from 'date-fns';

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

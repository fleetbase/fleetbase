import { module, test } from 'qunit';
import { initialize } from '@fleetbase/console/instance-initializers/load-leaflet';

module('Unit | Instance Initializer | load-leaflet', function () {
    test('it loads leaflet and patches Control to stop refocusing the map', function (assert) {
        let loadOptions;
        initialize({
            lookup: () => ({
                load(options) {
                    loadOptions = options;
                },
            }),
        });

        assert.strictEqual(typeof loadOptions.onReady, 'function', 'an onReady callback is supplied');

        // Drive onReady with a stand-in for the Leaflet global.
        let included;
        loadOptions.onReady({
            Control: {
                include(mixin) {
                    included = mixin;
                },
            },
            Util: { falseFn: 'false-fn' },
        });

        assert.deepEqual(included, { _refocusOnMap: 'false-fn' }, 'map refocusing is disabled');
    });

    test('it is a no-op when the leaflet service is unavailable', function (assert) {
        initialize({ lookup: () => undefined });

        assert.ok(true, 'no error is thrown without a leaflet service');
    });
});

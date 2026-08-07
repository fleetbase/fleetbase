import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';
import Service from '@ember/service';

class NotificationsStub extends Service {
    successes = [];
    success(m) {
        this.successes.push(m);
    }
}

// A stand-in for the brand record: `set` mirrors Ember's, and `save` is controllable.
function brandModel(attrs = {}) {
    return {
        saved: 0,
        set(key, value) {
            this[key] = value;
        },
        save() {
            this.saved++;
            return this.saveResult ?? Promise.resolve();
        },
        ...attrs,
    };
}

module('Unit | Controller | console/admin/branding', function (hooks) {
    setupTest(hooks);

    hooks.beforeEach(function () {
        const self = this;
        this.uploads = [];

        class FetchStub extends Service {
            uploadFile = {
                perform(file, options, onComplete) {
                    self.uploads.push({ file, options });
                    // the real task calls back with the stored file
                    onComplete(self.uploadedFile ?? { id: 'file_1', url: '/uploads/new.png' });
                    return Promise.resolve();
                },
            };
        }
        class ThemeStub extends Service {
            applied = [];
            setTheme(theme) {
                this.applied.push(theme);
            }
        }

        this.owner.register('service:notifications', NotificationsStub);
        this.owner.register('service:fetch', FetchStub);
        this.owner.register('service:theme', ThemeStub);

        this.controller = this.owner.lookup('controller:console/admin/branding');
        this.notifications = this.owner.lookup('service:notifications');
        this.theme = this.owner.lookup('service:theme');
        this.controller.model = brandModel();
    });

    test('it offers a light and dark theme', function (assert) {
        assert.deepEqual(this.controller.themeOptions, ['light', 'dark']);
    });

    test('setTheme records the choice on the model and applies it', function (assert) {
        this.controller.setTheme('dark');

        assert.strictEqual(this.controller.model.default_theme, 'dark', 'the model is updated');
        assert.deepEqual(this.theme.applied, ['dark'], 'the theme is applied immediately');
    });

    test('unset clears a single key', function (assert) {
        this.controller.model.set('logo_uuid', 'abc');

        this.controller.unset('logo_uuid');

        assert.strictEqual(this.controller.model.logo_uuid, null, 'it defaults to null');
    });

    test('unset clears every key in an array', function (assert) {
        this.controller.model.set('a', '1');
        this.controller.model.set('b', '2');

        this.controller.unset(['a', 'b']);

        // The recursive call passes `undefined`, which triggers the `newValue = null`
        // default parameter — so array clearing nulls the keys just like the single-key
        // form, and the explicit undefined has no effect.
        assert.strictEqual(this.controller.model.a, null);
        assert.strictEqual(this.controller.model.b, null);
    });

    test('unsetIcon clears the icon and restores the default image', function (assert) {
        this.controller.model.set('icon_uuid', 'abc');

        this.controller.unsetIcon();

        assert.strictEqual(this.controller.model.icon_uuid, null);
        assert.strictEqual(this.controller.model.icon_url, '/images/icon.png', 'the default icon is restored after clearing');
    });

    test('unsetLogo clears the logo and restores the default image', function (assert) {
        this.controller.model.set('logo_uuid', 'abc');

        this.controller.unsetLogo();

        assert.strictEqual(this.controller.model.logo_uuid, null);
        assert.strictEqual(this.controller.model.logo_url, '/images/fleetbase-logo-svg.svg', 'the default logo is restored after clearing');
    });

    test('save persists the brand and reports success', async function (assert) {
        await this.controller.save();

        assert.strictEqual(this.controller.model.saved, 1);
        assert.deepEqual(this.notifications.successes, ['Branding settings saved.']);
        assert.false(this.controller.isLoading, 'loading is cleared');
    });

    test('save restores the default images when the server clears them', async function (assert) {
        this.controller.model = brandModel({ logo_url: null, icon_url: null });

        await this.controller.save();

        assert.strictEqual(this.controller.model.logo_url, '/images/fleetbase-logo-svg.svg');
        assert.strictEqual(this.controller.model.icon_url, '/images/icon.png');
    });

    test('save leaves populated images alone', async function (assert) {
        this.controller.model = brandModel({ logo_url: '/custom-logo.png', icon_url: '/custom-icon.png' });

        await this.controller.save();

        assert.strictEqual(this.controller.model.logo_url, '/custom-logo.png');
        assert.strictEqual(this.controller.model.icon_url, '/custom-icon.png');
    });

    test('save clears the loading flag even when saving fails', async function (assert) {
        this.controller.model = brandModel({ saveResult: Promise.reject(new Error('nope')) });

        await this.controller.save().catch(() => {});

        assert.false(this.controller.isLoading, 'the finally block always runs');
        assert.deepEqual(this.notifications.successes, [], 'no success is reported');
    });

    test('uploadIcon stores the uploaded file on the model', async function (assert) {
        await this.controller.uploadIcon({ name: 'icon.png' });

        assert.deepEqual(this.uploads.at(-1).options, { path: 'uploads/system', type: 'system' });
        assert.strictEqual(this.controller.model.icon_uuid, 'file_1');
        assert.strictEqual(this.controller.model.icon_url, '/uploads/new.png');
        assert.false(this.controller.isLoading);
    });

    test('uploadLogo stores the uploaded file on the model', async function (assert) {
        await this.controller.uploadLogo({ name: 'logo.png' });

        assert.deepEqual(this.uploads.at(-1).options, { path: 'uploads/system', type: 'system' });
        assert.strictEqual(this.controller.model.logo_uuid, 'file_1');
        assert.strictEqual(this.controller.model.logo_url, '/uploads/new.png');
        assert.false(this.controller.isLoading);
    });
});

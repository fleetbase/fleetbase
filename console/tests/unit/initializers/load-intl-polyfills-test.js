import { module, test } from 'qunit';
import { initialize, pinDefaultLocale, preferredLanguage } from '@fleetbase/console/initializers/load-intl-polyfills';

module('Unit | Initializer | load-intl-polyfills', function () {
    test('it defers readiness while the polyfills load and advances afterwards', async function (assert) {
        const calls = [];
        let advanced;
        const didAdvance = new Promise((resolve) => (advanced = resolve));

        const application = {
            deferReadiness: () => calls.push('defer'),
            advanceReadiness: () => {
                calls.push('advance');
                advanced();
            },
        };

        initialize(application);

        assert.deepEqual(calls, ['defer'], 'readiness is deferred synchronously');

        // The polyfills load through dynamic imports in a bare async IIFE, which settled()
        // does not track — wait on advanceReadiness itself.
        await didAdvance;

        assert.deepEqual(calls, ['defer', 'advance'], 'readiness advances once the polyfills resolve');
    });
});

module('Unit | Initializer | load-intl-polyfills | default locale', function () {
    test('the preferred language is the first browser language with locale data, else English', function (assert) {
        const langs = ['ar', 'de', 'en', 'fr'];

        assert.strictEqual(preferredLanguage(langs, ['fr-CA', 'en-US']), 'fr');
        assert.strictEqual(preferredLanguage(langs, ['ja-JP', 'en-SG']), 'en');
        assert.strictEqual(preferredLanguage(langs, ['ja-JP']), 'en');
        assert.strictEqual(preferredLanguage(['ar', 'de'], []), 'ar');
    });

    test('a polyfill is pinned to that language instead of the first locale data it loaded', function (assert) {
        // A polyfill records the first locale data it receives as its default ("ar" here); native
        // constructors carry no __defaultLocale and must be left untouched.
        const polyfilled = { __defaultLocale: 'ar' };
        const native = function NativeDateTimeFormat() {};
        const intl = { NumberFormat: polyfilled, PluralRules: { __defaultLocale: 'ar' }, DateTimeFormat: native };

        pinDefaultLocale('en', intl);

        assert.strictEqual(intl.NumberFormat.__defaultLocale, 'en');
        assert.strictEqual(intl.PluralRules.__defaultLocale, 'en');
        assert.strictEqual(native.__defaultLocale, undefined);
    });

    test('after loading, formatting without a locale follows the browser language, not the first locale loaded', async function (assert) {
        let advanced;
        const didAdvance = new Promise((resolve) => (advanced = resolve));

        initialize({ deferReadiness() {}, advanceReadiness: () => advanced() });
        await didAdvance;

        const language = (tag) => String(tag).toLowerCase().split('-')[0];
        const browser = preferredLanguage(['ar', 'bg', 'de', 'en', 'es', 'fa', 'fr', 'it', 'mn', 'pt', 'ru', 'uz', 'vi', 'zh'], navigator.languages);

        assert.strictEqual(language(new Intl.NumberFormat().resolvedOptions().locale), browser);
        assert.strictEqual(language(new Intl.DateTimeFormat().resolvedOptions().locale), browser);
        // Every console language still has data, which ember-intl needs to start.
        assert.strictEqual(Intl.NumberFormat.supportedLocalesOf(['mn']).length, 1);
    });
});

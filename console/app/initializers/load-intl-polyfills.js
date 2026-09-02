import translations from 'ember-intl/translations';
import { all } from 'rsvp';

const isBrowser = typeof window !== 'undefined';
const isValidLang = (lang) => typeof lang === 'string' && /^[a-z]{2,3}$/i.test(lang);

// The only caller maps over ember-intl's translation manifest, so a tag is always
// present; the default exists purely as a guard.
/* istanbul ignore next -- unreachable default argument */
function langOf(tag = 'en') {
    return String(tag).toLowerCase().split('-')[0];
}

async function loadBasePolyfills() {
    await import('@formatjs/intl-numberformat/polyfill-force');
    await import('@formatjs/intl-pluralrules/polyfill-force');
    await import('@formatjs/intl-datetimeformat/polyfill-force');
    await import('@formatjs/intl-relativetimeformat/polyfill-force');
}

async function loadLocaleData(lang) {
    // initialize() already filters the language list through isValidLang, so this is a
    // second line of defence that the initializer itself can never trigger.
    /* istanbul ignore next -- unreachable via initialize() */
    if (!isValidLang(lang)) return;

    return all([
        import(`@formatjs/intl-numberformat/locale-data/${lang}.js`),
        import(`@formatjs/intl-pluralrules/locale-data/${lang}.js`),
        import(`@formatjs/intl-datetimeformat/locale-data/${lang}.js`),
        import(`@formatjs/intl-relativetimeformat/locale-data/${lang}.js`),
    ]);
}

export function initialize(application) {
    // There is no window to polyfill outside a browser. The test suite only ever runs in
    // one, so this arm cannot be exercised.
    /* istanbul ignore next -- no browser, nothing to polyfill */
    if (!isBrowser) return;

    const locales = translations.map(([locale]) => String(locale));
    const langs = [...new Set(locales.map(langOf).filter(isValidLang))];

    application.deferReadiness();

    (async () => {
        await loadBasePolyfills();
        await all(langs.map(loadLocaleData));
        application.advanceReadiness();
    })();
}

export default {
    name: 'load-intl-polyfills',
    initialize,
};

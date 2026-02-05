import translations from 'ember-intl/translations';
import { all } from 'rsvp';

const isBrowser = typeof window !== 'undefined';
const isValidLang = (lang) => typeof lang === 'string' && /^[a-z]{2,3}$/i.test(lang);

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
    if (!isValidLang(lang)) return;

    return all([
        import(`@formatjs/intl-numberformat/locale-data/${lang}.js`),
        import(`@formatjs/intl-pluralrules/locale-data/${lang}.js`),
        import(`@formatjs/intl-datetimeformat/locale-data/${lang}.js`),
        import(`@formatjs/intl-relativetimeformat/locale-data/${lang}.js`),
    ]);
}

export function initialize(application) {
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

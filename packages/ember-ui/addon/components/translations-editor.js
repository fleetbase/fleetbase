import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action, computed } from '@ember/object';
import { isArray } from '@ember/array';
import { isBlank } from '@ember/utils';
import { underscore } from '@ember/string';

export default class TranslationsEditorComponent extends Component {
    @tracked languages = [];
    @tracked language;
    @tracked translations = {};

    @computed('translations', 'language') get loadedTranslations() {
        return this.translations[this.language] ?? {};
    }

    constructor() {
        super(...arguments);

        this.languages = Object.keys(this.args.value ?? {}) ?? [];
        this.translations = this.setDefaultKeys(this.args.value, this.args.defaultKeys);

        // load first languages
        if (this.languages.firstObject) {
            this.loadLanguage(this.languages.firstObject);
        }
    }

    @action setDefaultKeys(value, defaultKeys = [], forceKeys = false) {
        if (!defaultKeys) {
            return value ?? {};
        }

        if (isBlank(value) || isArray(value) || typeof value !== 'object') {
            value = {};
        }

        if (forceKeys === true) {
            for (let i = 0; i < defaultKeys.length; i++) {
                const defaultKey = defaultKeys.objectAt(i);

                if (!value[defaultKey]) {
                    value[defaultKey] = null;
                }
            }

            return value;
        }

        for (let lang in value) {
            for (let i = 0; i < defaultKeys.length; i++) {
                const defaultKey = defaultKeys.objectAt(i);

                if (!value[lang][defaultKey]) {
                    value[lang][defaultKey] = null;
                }
            }
        }

        return value;
    }

    @action updateTranslations(translations) {
        this.translations = translations;

        if (typeof this.args.onChange === 'function') {
            this.args.onChange(translations);
        }
    }

    @action setTranslationValue(key, event) {
        const { translations } = this;
        const { target } = event;
        const value = target.value?.trim();

        translations[this.language][key] = value;
        this.updateTranslations(translations);
    }

    @action setTranslationKey(key, event) {
        const { translations } = this;
        const { target } = event;
        const newKey = underscore(target.value);

        const currentValue = translations[this.language][key];
        delete translations[this.language][key];

        translations[this.language][newKey] = currentValue;
        this.updateTranslations(translations);
    }

    @action addTranslation() {
        const { translations } = this;
        const count = Object.keys(this.translations[this.language]).length;

        translations[this.language][`translation_${count}`] = null;
        this.updateTranslations(translations);
    }

    @action removeTranslation(key) {
        const { translations } = this;

        delete translations[this.language][key];
        this.updateTranslations(translations);
    }

    @action loadLanguage(language) {
        this.language = language;
    }

    @action addLanguage(iso2) {
        const { translations } = this;
        const { defaultKeys } = this.args;
        const lang = iso2.toLowerCase();

        this.languages.pushObject(lang);
        this.language = lang;
        translations[lang] = this.setDefaultKeys({}, defaultKeys, true);
        this.updateTranslations(translations);
    }
}

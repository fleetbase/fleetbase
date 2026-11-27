import Service, { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import window from 'ember-window-mock';

/** The console shells: the Map-Canvas+ shell, and the classic header + sidebar fallback. */
export const LAYOUTS = Object.freeze(['canvas', 'classic']);

/** Canvas is the default for everyone; classic stays available per user until the new UI is adopted. */
export const DEFAULT_LAYOUT = 'canvas';

/** sessionStorage key of the `?layout=` override, which lasts for the browser session only. */
export const OVERRIDE_KEY = 'fleetbase:console-layout';

export function isLayout(value) {
    return LAYOUTS.includes(value);
}

/**
 * The `?layout=` value a transition carries, if any. Undeclared query params are
 * on `to.queryParams` for URL transitions; the URL itself is the fallback.
 */
export function layoutFromTransition(transition) {
    const fromParams = transition?.to?.queryParams?.layout;
    if (fromParams) {
        return fromParams;
    }

    const url = transition?.intent?.url;
    if (typeof url === 'string' && url.includes('?')) {
        return new URLSearchParams(url.slice(url.indexOf('?') + 1)).get('layout');
    }

    return null;
}

function readOverride() {
    try {
        const value = window.sessionStorage.getItem(OVERRIDE_KEY);
        return isLayout(value) ? value : null;
    } catch {
        return null;
    }
}

function writeOverride(value) {
    try {
        if (value) {
            window.sessionStorage.setItem(OVERRIDE_KEY, value);
        } else {
            window.sessionStorage.removeItem(OVERRIDE_KEY);
        }
    } catch {
        // Storage can be unavailable (private mode, blocked site data); the override then lasts until reload.
    }
}

/**
 * Which console shell to render.
 *
 * The person's choice is the `layout` user option (`canvas` or `classic`,
 * default `canvas`). `?layout=classic` (or `canvas`) on any console URL
 * overrides it for the rest of the browser session, for support and testing;
 * choosing a layout from the account menu saves the option and drops the
 * override.
 */
export default class ConsoleLayoutService extends Service {
    @service currentUser;

    @tracked override = readOverride();
    @tracked chosen = null;

    get saved() {
        const value = this.currentUser.getOption('layout');
        return isLayout(value) ? value : null;
    }

    get current() {
        return this.override ?? this.chosen ?? this.saved ?? DEFAULT_LAYOUT;
    }

    get isCanvas() {
        return this.current === 'canvas';
    }

    get isClassic() {
        return this.current === 'classic';
    }

    /** The other layout, offered by the account menu's switch. */
    get alternate() {
        return this.isCanvas ? 'classic' : 'canvas';
    }

    /** Applies a `?layout=` value for this browser session; anything else is ignored. */
    applyOverride(value) {
        if (!isLayout(value)) {
            return false;
        }

        this.override = value;
        writeOverride(value);
        return true;
    }

    /** Saves `layout` as the person's choice and clears any session override. */
    switchTo(layout) {
        if (!isLayout(layout)) {
            return false;
        }

        this.currentUser.setOption('layout', layout);
        this.chosen = layout;
        this.override = null;
        writeOverride(null);
        return true;
    }
}

import window from 'ember-window-mock';
import getUrlParam from './get-url-param';

export default function isMenuItemActive(section, slug, view = null) {
    let path = window.location.pathname;
    let segments = path.replace(/^\/|\/$/g, '').split('/');
    let sectionMatch = segments[0] === section;
    let slugOnly = segments[0] === slug && section === slug && view === null;
    let slugMatch = segments.includes(slug);
    let viewMatch = segments.includes(view) || getUrlParam('view') === view;

    if (slugOnly && view) {
        return slugMatch && viewMatch;
    }

    if (slugOnly) {
        return slugMatch;
    }

    if (section && view) {
        return sectionMatch && slugMatch && viewMatch;
    }

    if (section) {
        return sectionMatch && slugMatch;
    }

    if (view) {
        return slugMatch && viewMatch;
    }

    return slugMatch;
}

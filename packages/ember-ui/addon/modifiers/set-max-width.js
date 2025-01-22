import { modifier } from 'ember-modifier';

export default modifier(function setMaxWidth(element, [to = '100%', includeSpacing = false]) {
    // defaults to 100% - if numeric 100px/100em then use literal value, otherwise assume element selector to use it's maxWidth if found
    const maxWidth = to.match(/^\d/) ? `${to}` : document.querySelector(to);
    // used to calculate width of an element
    const calculateWidth = (e) => {
        const style = e.currentStyle || window.getComputedStyle(e);
        return includeSpacing ? `${e.offsetWidth}px` : `${e.offsetWidth - parseInt(style.paddingLeft) - parseInt(style.marginLeft)}px`;
    };

    if (maxWidth) {
        // sets this elements maxwidth to either a specific max width of the maxwidth of another element
        element.style.maxWidth = typeof maxWidth === 'string' ? maxWidth : calculateWidth(maxWidth);
    }
});

export function injectAsset ({ type, content, name, syntax }) {
    switch (type) {
        case 'css':
            injectStylesheet(content, syntax);
            break;
        case 'meta':
            injectMeta(name, content);
            break;
        case 'js':
        default:
            injectScript(content, syntax);
            break;
    }
}

export function injectMeta (name, content) {
    const meta = document.createElement('meta');
    meta.name = name;
    meta.content = content;
    document.head.appendChild(meta);
}

export function injectScript (content, type = 'application/javascript') {
    const script = document.createElement('script');
    script.type = type;
    script.text = content;
    document.head.appendChild(script);
}

export function injectStylesheet (content, type = 'text/css') {
    const style = document.createElement('style');
    style.type = type;
    if (style.styleSheet) {
        style.styleSheet.cssText = content;
    } else {
        style.appendChild(document.createTextNode(content));
    }
    document.head.appendChild(style);
}

export default {
    injectAsset,
    injectMeta,
    injectScript,
    injectStylesheet,
};

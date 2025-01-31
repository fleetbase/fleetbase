export default function getUrlParam(key) {
    const urlParams = new URLSearchParams(window.location.search);
    let urlParam = urlParams.get(key);

    if (!urlParam) {
        urlParam = urlParams.get(`${key}[]`);
    }

    return urlParam;
}

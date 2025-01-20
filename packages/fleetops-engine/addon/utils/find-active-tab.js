export default function findActiveTab(tabs = [], identifier) {
    if (identifier) {
        return tabs.find(({ slug, id }) => slug === identifier || id === identifier);
    }

    return tabs[0];
}

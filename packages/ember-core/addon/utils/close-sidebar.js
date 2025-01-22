export default function closeSidebar() {
    const sidebarNode = window?.document?.querySelector('nav.next-sidebar');

    if (sidebarNode?.classList?.contains('is-open')) {
        sidebarNode?.classList?.remove('is-open');
    }
}

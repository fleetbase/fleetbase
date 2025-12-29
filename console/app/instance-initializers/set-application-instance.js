export function initialize(appInstance) {
    // Look up UniverseService and set the application instance
    const universeService = appInstance.lookup('service:universe');
    if (universeService) {
        universeService.setApplicationInstance(appInstance);
    }
}

export default {
    initialize
};

import { getOwner } from '@ember/application';
import config from '@fleetbase/console/config/environment';

export function initialize(applicationInstance) {
    // Only initialize if analytics is enabled
    if (!config.analytics?.enabled) {
        return;
    }

    try {
        // Get the analytics service
        const analytics = applicationInstance.lookup('service:analytics');

        if (analytics && analytics.isInitialized) {
            // Get current user from session or auth service
            const session = applicationInstance.lookup('service:session');
            const auth = applicationInstance.lookup('service:auth');

            let currentUser = null;

            // Try to get user from session service
            if (session && session.isAuthenticated) {
                currentUser = session.data?.authenticated?.user || session.data?.user;
            }

            // Try to get user from auth service
            if (!currentUser && auth) {
                currentUser = auth.user || auth.currentUser;
            }

            // Set user in analytics if available
            if (currentUser) {
                analytics.setUser(currentUser);
                analytics.trackEvent('user_session_start', {
                    session_start_timestamp: new Date().toISOString()
                });
            }

            // Track initial page view
            analytics.trackPageView(window.location.pathname, document.title);

            // Set up route change tracking
            const router = applicationInstance.lookup('service:router');
            if (router) {
                router.on('routeDidChange', (transition) => {
                    if (analytics && analytics.isInitialized) {
                        const routeName = transition.to?.name || transition.to?.routeName || 'unknown';
                        analytics.trackPageView(routeName, document.title);
                    }
                });
            }

            // Listen for user login events
            const eventBus = applicationInstance.lookup('service:eventBus');
            if (eventBus) {
                eventBus.on('user:login', (user) => {
                    if (analytics && analytics.isInitialized) {
                        analytics.trackLogin(user, 'email');
                    }
                });

                eventBus.on('user:logout', () => {
                    if (analytics && analytics.isInitialized) {
                        analytics.trackEvent('user_logout', {
                            logout_timestamp: new Date().toISOString()
                        });
                    }
                });
            }

            console.log('Analytics instance initializer: Route tracking and user tracking enabled');
        } else {
            console.warn('Analytics instance initializer: Analytics service not available');
        }
    } catch (error) {
        console.error('Analytics instance initializer error:', error);
    }
}

export default {
    initialize,
    name: 'analytics'
};

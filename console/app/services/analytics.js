import Service from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { getOwner } from '@ember/application';
import config from '@fleetbase/console/config/environment';

export default class AnalyticsService extends Service {
    @tracked isInitialized = false;
    @tracked trackingId = null;
    @tracked currentUser = null;

    constructor() {
        super(...arguments);
        this.initialize();
    }

    initialize() {
        // Check if Google Analytics is available
        if (typeof gtag !== 'undefined' && config.analytics?.trackingId) {
            this.trackingId = config.analytics.trackingId;
            this.isInitialized = true;
            console.log('Analytics service initialized with tracking ID:', this.trackingId);
        } else {
            console.warn('Analytics service: Google Analytics not available or tracking ID not configured');
        }
    }

    /**
     * Set current user information for tracking
     * @param {Object} user - User object with id, name, email, etc.
     */
    setUser(user) {
        if (!user) return;

        this.currentUser = user;

        if (this.isInitialized && this.trackingId) {
            try {
                // Set user properties in GA4
                gtag('config', this.trackingId, {
                    user_properties: {
                        user_id: user.id || user.uuid,
                        user_name: user.name,
                        user_email: user.email,
                        user_company: user.company?.name,
                        user_role: user.role,
                        user_permissions: user.permissions?.join(',') || ''
                    }
                });

                // Set user ID for cross-device tracking
                gtag('config', this.trackingId, {
                    user_id: user.id || user.uuid
                });

                console.log('Analytics user set:', user.name, user.email);
            } catch (error) {
                console.error('Error setting user in analytics:', error);
            }
        }
    }

    /**
     * Get current user context for events
     * @returns {Object} User context object
     */
    getUserContext() {
        if (!this.currentUser) return {};

        return {
            user_id: this.currentUser.id || this.currentUser.uuid,
            user_name: this.currentUser.name,
            user_email: this.currentUser.email,
            user_company: this.currentUser.company?.name,
            user_role: this.currentUser.role
        };
    }

    /**
     * Track a page view
     * @param {string} pagePath - The page path to track
     * @param {string} pageTitle - Optional page title
     */
    trackPageView(pagePath, pageTitle = null) {
        if (!this.isInitialized || !this.trackingId) {
            console.warn('Analytics not initialized, skipping page view tracking');
            return;
        }

        try {
            const config = {
                page_path: pagePath,
                page_title: pageTitle || document.title
            };

            gtag('config', this.trackingId, config);
            console.log('Tracked page view:', config);
        } catch (error) {
            console.error('Error tracking page view:', error);
        }
    }

    /**
     * Track a custom event with user context
     * @param {string} eventName - The name of the event
     * @param {Object} parameters - Event parameters
     */
    trackEvent(eventName, parameters = {}) {
        if (!this.isInitialized || !this.trackingId) {
            console.warn('Analytics not initialized, skipping event tracking');
            return;
        }

        try {
            // Add user context to all events
            const eventData = {
                ...this.getUserContext(),
                ...parameters
            };

            gtag('event', eventName, eventData);
            console.log('Tracked event:', eventName, eventData);
        } catch (error) {
            console.error('Error tracking event:', error);
        }
    }

    /**
     * Track user engagement
     * @param {string} action - The engagement action
     * @param {Object} parameters - Additional parameters
     */
    trackEngagement(action, parameters = {}) {
        this.trackEvent('user_engagement', {
            engagement_time_msec: 100,
            action,
            ...parameters
        });
    }

    /**
     * Track user login with detailed user info
     * @param {Object} user - User object with login details
     * @param {string} method - Login method used
     */
    trackLogin(user, method = 'email') {
        this.setUser(user);
        this.trackEvent('login', {
            method,
            login_timestamp: new Date().toISOString()
        });
    }

    /**
     * Track user signup with detailed user info
     * @param {Object} user - User object with signup details
     * @param {string} method - Signup method used
     */
    trackSignUp(user, method = 'email') {
        this.setUser(user);
        this.trackEvent('sign_up', {
            method,
            signup_timestamp: new Date().toISOString()
        });
    }

    /**
     * Track order creation with user context
     * @param {Object} orderData - Order information
     */
    trackOrderCreation(orderData = {}) {
        this.trackEvent('order_creation', {
            currency: 'USD',
            value: orderData.value || 0,
            items: orderData.items || [],
            order_id: orderData.id || orderData.uuid,
            order_type: orderData.type,
            order_status: orderData.status,
            pickup_location: orderData.pickup?.address,
            dropoff_location: orderData.dropoff?.address,
            ...orderData
        });
    }

    /**
     * Track driver assignment with detailed information
     * @param {Object} assignmentData - Assignment information
     */
    trackDriverAssignment(assignmentData = {}) {
        this.trackEvent('driver_assignment', {
            order_id: assignmentData.order_id,
            order_uuid: assignmentData.order_uuid,
            driver_id: assignmentData.driver_id,
            driver_uuid: assignmentData.driver_uuid,
            driver_name: assignmentData.driver_name,
            driver_email: assignmentData.driver_email,
            driver_phone: assignmentData.driver_phone,
            vehicle_id: assignmentData.vehicle_id,
            vehicle_uuid: assignmentData.vehicle_uuid,
            vehicle_name: assignmentData.vehicle_name,
            vehicle_plate: assignmentData.vehicle_plate,
            assignment_type: assignmentData.type || 'manual',
            assignment_timestamp: new Date().toISOString(),
            ...assignmentData
        });
    }

    /**
     * Track vehicle assignment with detailed information
     * @param {Object} assignmentData - Assignment information
     */
    trackVehicleAssignment(assignmentData = {}) {
        this.trackEvent('vehicle_assignment', {
            order_id: assignmentData.order_id,
            order_uuid: assignmentData.order_uuid,
            vehicle_id: assignmentData.vehicle_id,
            vehicle_uuid: assignmentData.vehicle_uuid,
            vehicle_name: assignmentData.vehicle_name,
            vehicle_plate: assignmentData.vehicle_plate,
            vehicle_type: assignmentData.vehicle_type,
            vehicle_model: assignmentData.vehicle_model,
            vehicle_year: assignmentData.vehicle_year,
            driver_id: assignmentData.driver_id,
            driver_uuid: assignmentData.driver_uuid,
            driver_name: assignmentData.driver_name,
            assignment_type: assignmentData.type || 'manual',
            assignment_timestamp: new Date().toISOString(),
            ...assignmentData
        });
    }

    /**
     * Track place creation/update
     * @param {Object} placeData - Place information
     */
    trackPlaceAction(action, placeData = {}) {
        this.trackEvent(`place_${action}`, {
            place_id: placeData.id || placeData.uuid,
            place_name: placeData.name,
            place_address: placeData.address,
            place_type: placeData.type,
            place_category: placeData.category,
            place_latitude: placeData.latitude,
            place_longitude: placeData.longitude,
            place_company: placeData.company?.name,
            action_timestamp: new Date().toISOString(),
            ...placeData
        });
    }

    /**
     * Track fleet creation/update
     * @param {Object} fleetData - Fleet information
     */
    trackFleetAction(action, fleetData = {}) {
        this.trackEvent(`fleet_${action}`, {
            fleet_id: fleetData.id || fleetData.uuid,
            fleet_name: fleetData.name,
            fleet_type: fleetData.type,
            fleet_size: fleetData.size,
            fleet_vehicles_count: fleetData.vehicles_count,
            fleet_drivers_count: fleetData.drivers_count,
            fleet_company: fleetData.company?.name,
            action_timestamp: new Date().toISOString(),
            ...fleetData
        });
    }

    /**
     * Track route optimization
     * @param {Object} routeData - Route information
     */
    trackRouteOptimization(routeData = {}) {
        this.trackEvent('route_optimization', {
            stops_count: routeData.stops_count || 0,
            total_distance: routeData.total_distance || 0,
            total_time: routeData.total_time || 0,
            route_id: routeData.id || routeData.uuid,
            route_name: routeData.name,
            optimization_type: routeData.optimization_type,
            optimization_timestamp: new Date().toISOString(),
            ...routeData
        });
    }

    /**
     * Track driver creation/update
     * @param {Object} driverData - Driver information
     */
    trackDriverAction(action, driverData = {}) {
        this.trackEvent(`driver_${action}`, {
            driver_id: driverData.id || driverData.uuid,
            driver_name: driverData.name,
            driver_email: driverData.email,
            driver_phone: driverData.phone,
            driver_license: driverData.license,
            driver_status: driverData.status,
            driver_company: driverData.company?.name,
            driver_fleet: driverData.fleet?.name,
            action_timestamp: new Date().toISOString(),
            ...driverData
        });
    }

    /**
     * Track vehicle creation/update
     * @param {Object} vehicleData - Vehicle information
     */
    trackVehicleAction(action, vehicleData = {}) {
        this.trackEvent(`vehicle_${action}`, {
            vehicle_id: vehicleData.id || vehicleData.uuid,
            vehicle_name: vehicleData.name,
            vehicle_plate: vehicleData.plate,
            vehicle_type: vehicleData.type,
            vehicle_model: vehicleData.model,
            vehicle_year: vehicleData.year,
            vehicle_status: vehicleData.status,
            vehicle_company: vehicleData.company?.name,
            vehicle_fleet: vehicleData.fleet?.name,
            action_timestamp: new Date().toISOString(),
            ...vehicleData
        });
    }

    /**
     * Set user properties
     * @param {Object} properties - User properties to set
     */
    setUserProperties(properties = {}) {
        if (!this.isInitialized || !this.trackingId) {
            return;
        }

        try {
            gtag('config', this.trackingId, {
                user_properties: properties
            });
        } catch (error) {
            console.error('Error setting user properties:', error);
        }
    }

    /**
     * Set custom dimensions
     * @param {Object} dimensions - Custom dimensions to set
     */
    setCustomDimensions(dimensions = {}) {
        if (!this.isInitialized || !this.trackingId) {
            return;
        }

        try {
            gtag('config', this.trackingId, {
                custom_map: dimensions
            });
        } catch (error) {
            console.error('Error setting custom dimensions:', error);
        }
    }
}

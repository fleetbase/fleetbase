# Analytics Service Usage Guide

## Overview
The enhanced analytics service provides comprehensive tracking of user actions, driver assignments, vehicle assignments, places, and fleets with detailed user context.

## User Tracking

### Setting User Information
```javascript
// In your login component or service
import { inject as service } from '@ember/service';

export default class LoginComponent extends Component {
    @service analytics;
    
    @action
    async login() {
        try {
            const user = await this.auth.login(credentials);
            
            // Set user in analytics (automatically tracks login)
            this.analytics.trackLogin(user, 'email');
            
        } catch (error) {
            console.error('Login failed:', error);
        }
    }
}
```

### Manual User Setting
```javascript
// Set user manually if needed
this.analytics.setUser({
    id: 'user-123',
    uuid: 'user-uuid-123',
    name: 'John Doe',
    email: 'john@example.com',
    company: { name: 'Fleet Company' },
    role: 'admin',
    permissions: ['read', 'write', 'admin']
});
```

## Event Tracking

### Driver Assignment Tracking
```javascript
// Track driver assignment attempt
this.analytics.trackDriverAssignment({
    order_id: order.id,
    order_uuid: order.uuid,
    order_public_id: order.public_id,
    driver_id: driver.id,
    driver_uuid: driver.uuid,
    driver_name: driver.name,
    driver_email: driver.email,
    driver_phone: driver.phone,
    vehicle_id: driver.vehicle?.id,
    vehicle_uuid: driver.vehicle?.uuid,
    vehicle_name: driver.vehicle?.name,
    vehicle_plate: driver.vehicle?.plate,
    type: 'attempt' // or 'success', 'failure'
});
```

### Vehicle Assignment Tracking
```javascript
// Track vehicle assignment
this.analytics.trackVehicleAssignment({
    order_id: order.id,
    order_uuid: order.uuid,
    vehicle_id: vehicle.id,
    vehicle_uuid: vehicle.uuid,
    vehicle_name: vehicle.name,
    vehicle_plate: vehicle.plate,
    vehicle_type: vehicle.type,
    vehicle_model: vehicle.model,
    vehicle_year: vehicle.year,
    driver_id: driver?.id,
    driver_uuid: driver?.uuid,
    driver_name: driver?.name,
    type: 'manual' // or 'automatic'
});
```

### Place Tracking
```javascript
// Track place creation
this.analytics.trackPlaceAction('created', {
    id: place.id,
    uuid: place.uuid,
    name: place.name,
    address: place.address,
    type: place.type,
    category: place.category,
    latitude: place.latitude,
    longitude: place.longitude,
    company: place.company
});

// Track place update
this.analytics.trackPlaceAction('updated', placeData);

// Track place deletion
this.analytics.trackPlaceAction('deleted', placeData);
```

### Fleet Tracking
```javascript
// Track fleet creation
this.analytics.trackFleetAction('created', {
    id: fleet.id,
    uuid: fleet.uuid,
    name: fleet.name,
    type: fleet.type,
    size: fleet.size,
    vehicles_count: fleet.vehicles_count,
    drivers_count: fleet.drivers_count,
    company: fleet.company
});

// Track fleet update
this.analytics.trackFleetAction('updated', fleetData);

// Track fleet deletion
this.analytics.trackFleetAction('deleted', fleetData);
```

### Driver Management Tracking
```javascript
// Track driver creation
this.analytics.trackDriverAction('created', {
    id: driver.id,
    uuid: driver.uuid,
    name: driver.name,
    email: driver.email,
    phone: driver.phone,
    license: driver.license,
    status: driver.status,
    company: driver.company,
    fleet: driver.fleet
});

// Track driver update
this.analytics.trackDriverAction('updated', driverData);

// Track driver deletion
this.analytics.trackDriverAction('deleted', driverData);
```

### Vehicle Management Tracking
```javascript
// Track vehicle creation
this.analytics.trackVehicleAction('created', {
    id: vehicle.id,
    uuid: vehicle.uuid,
    name: vehicle.name,
    plate: vehicle.plate,
    type: vehicle.type,
    model: vehicle.model,
    year: vehicle.year,
    status: vehicle.status,
    company: vehicle.company,
    fleet: vehicle.fleet
});

// Track vehicle update
this.analytics.trackVehicleAction('updated', vehicleData);

// Track vehicle deletion
this.analytics.trackVehicleAction('deleted', vehicleData);
```

### Order Tracking
```javascript
// Track order creation
this.analytics.trackOrderCreation({
    id: order.id,
    uuid: order.uuid,
    type: order.type,
    status: order.status,
    value: order.value,
    pickup: order.pickup,
    dropoff: order.dropoff,
    items: order.items
});
```

### Route Optimization Tracking
```javascript
// Track route optimization
this.analytics.trackRouteOptimization({
    id: route.id,
    uuid: route.uuid,
    name: route.name,
    stops_count: route.stops_count,
    total_distance: route.total_distance,
    total_time: route.total_time,
    optimization_type: route.optimization_type
});
```

## Custom Events
```javascript
// Track any custom event with user context
this.analytics.trackEvent('custom_action', {
    action_type: 'export_data',
    data_type: 'orders',
    file_format: 'csv',
    record_count: 150
});
```

## User Engagement Tracking
```javascript
// Track user engagement
this.analytics.trackEngagement('button_click', {
    button_name: 'save_order',
    page: 'order_edit',
    time_spent: 30000 // milliseconds
});
```

## Environment Configuration
```javascript
// In console/config/environment.js
analytics: {
    trackingId: getenv('GOOGLE_ANALYTICS_ID', 'G-49H8G09DDC'),
    enabled: toBoolean(getenv('GOOGLE_ANALYTICS_ENABLED', true)),
    debug: toBoolean(getenv('GOOGLE_ANALYTICS_DEBUG', false))
}
```

## Environment Variables
```bash
# .env file
GOOGLE_ANALYTICS_ID=G-49H8G09DDC
GOOGLE_ANALYTICS_ENABLED=true
GOOGLE_ANALYTICS_DEBUG=false
```

## What Gets Tracked Automatically

1. **User Login/Logout** - When users log in or out
2. **Page Views** - Every route change
3. **User Sessions** - Session start events
4. **User Context** - All events include user information (name, email, company, role)

## Data Privacy Notes

- User email addresses are tracked for analytics purposes
- All tracking respects user privacy settings
- Data is sent to Google Analytics 4
- Consider implementing data retention policies
- Ensure compliance with GDPR/CCPA if applicable

## Debugging

Enable debug mode in environment config to see detailed console logs:
```javascript
GOOGLE_ANALYTICS_DEBUG=true
```

This will show all tracking events in the browser console for debugging purposes.

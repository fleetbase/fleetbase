import Model, { attr, belongsTo } from '@ember-data/model';
import { computed } from '@ember/object';
import { format, formatDistanceToNow, differenceInMinutes } from 'date-fns';

export default class AlertModel extends Model {
    /** @attributes */
    @attr('string') type;
    @attr('string') severity;
    @attr('string') status;
    @attr('string') subject_type;
    @attr('string') subject_uuid;
    @attr('string') message;

    /** @json attributes */
    @attr() rule;
    @attr() context;
    @attr() meta;

    /** @dates */
    @attr('date') triggered_at;
    @attr('date') acknowledged_at;
    @attr('date') resolved_at;
    @attr('date') created_at;
    @attr('date') updated_at;
    @attr('date') deleted_at;

    /** @relationships */
    @belongsTo('company') company;
    @belongsTo('user', { inverse: null }) acknowledgedBy;
    @belongsTo('user', { inverse: null }) resolvedBy;

    /** @computed - Date formatting */
    @computed('triggered_at') get triggeredAgo() {
        if (!this.triggered_at) return 'Unknown';
        return formatDistanceToNow(this.triggered_at) + ' ago';
    }

    @computed('triggered_at') get triggeredAt() {
        if (!this.triggered_at) return 'Unknown';
        return format(this.triggered_at, 'yyyy-MM-dd HH:mm');
    }

    @computed('acknowledged_at') get acknowledgedAgo() {
        if (!this.acknowledged_at) return null;
        return formatDistanceToNow(this.acknowledged_at) + ' ago';
    }

    @computed('acknowledged_at') get acknowledgedAt() {
        if (!this.acknowledged_at) return 'Not acknowledged';
        return format(this.acknowledged_at, 'yyyy-MM-dd HH:mm');
    }

    @computed('resolved_at') get resolvedAgo() {
        if (!this.resolved_at) return null;
        return formatDistanceToNow(this.resolved_at) + ' ago';
    }

    @computed('resolved_at') get resolvedAt() {
        if (!this.resolved_at) return 'Not resolved';
        return format(this.resolved_at, 'yyyy-MM-dd HH:mm');
    }

    @computed('updated_at') get updatedAgo() {
        return formatDistanceToNow(this.updated_at) + ' ago';
    }

    @computed('updated_at') get updatedAt() {
        return format(this.updated_at, 'yyyy-MM-dd HH:mm');
    }

    @computed('created_at') get createdAgo() {
        return formatDistanceToNow(this.created_at) + ' ago';
    }

    @computed('created_at') get createdAt() {
        return format(this.created_at, 'yyyy-MM-dd HH:mm');
    }

    /** @computed - Status checks */
    @computed('acknowledged_at') get isAcknowledged() {
        return !!this.acknowledged_at;
    }

    @computed('resolved_at') get isResolved() {
        return !!this.resolved_at;
    }

    @computed('isAcknowledged', 'isResolved') get isPending() {
        return !this.isAcknowledged && !this.isResolved;
    }

    @computed('isAcknowledged', 'isResolved') get isActive() {
        return this.isAcknowledged && !this.isResolved;
    }

    /** @computed - Duration calculations */
    @computed('triggered_at', 'acknowledged_at') get acknowledgmentDurationMinutes() {
        if (!this.triggered_at || !this.acknowledged_at) return null;
        return differenceInMinutes(new Date(this.acknowledged_at), new Date(this.triggered_at));
    }

    @computed('triggered_at', 'resolved_at') get resolutionDurationMinutes() {
        if (!this.triggered_at || !this.resolved_at) return null;
        return differenceInMinutes(new Date(this.resolved_at), new Date(this.triggered_at));
    }

    @computed('triggered_at') get ageMinutes() {
        if (!this.triggered_at) return 0;
        return differenceInMinutes(new Date(), new Date(this.triggered_at));
    }

    @computed('acknowledgmentDurationMinutes') get acknowledgmentDurationFormatted() {
        if (!this.acknowledgmentDurationMinutes) return null;

        const minutes = this.acknowledgmentDurationMinutes;
        if (minutes < 60) return `${minutes}m`;
        if (minutes < 1440) return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
        return `${Math.floor(minutes / 1440)}d ${Math.floor((minutes % 1440) / 60)}h`;
    }

    @computed('resolutionDurationMinutes') get resolutionDurationFormatted() {
        if (!this.resolutionDurationMinutes) return null;

        const minutes = this.resolutionDurationMinutes;
        if (minutes < 60) return `${minutes}m`;
        if (minutes < 1440) return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
        return `${Math.floor(minutes / 1440)}d ${Math.floor((minutes % 1440) / 60)}h`;
    }

    @computed('ageMinutes') get ageFormatted() {
        const minutes = this.ageMinutes;
        if (minutes < 60) return `${minutes}m`;
        if (minutes < 1440) return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
        return `${Math.floor(minutes / 1440)}d ${Math.floor((minutes % 1440) / 60)}h`;
    }

    /** @computed - Severity styling */
    @computed('severity') get severityBadgeClass() {
        const severityClasses = {
            critical: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
            high: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
            medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
            low: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
            info: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
        };
        return severityClasses[this.severity] || severityClasses['info'];
    }

    @computed('severity') get severityIcon() {
        const severityIcons = {
            critical: 'fas fa-exclamation-circle',
            high: 'fas fa-exclamation-triangle',
            medium: 'fas fa-exclamation',
            low: 'fas fa-info-circle',
            info: 'fas fa-info',
        };
        return severityIcons[this.severity] || severityIcons['info'];
    }

    @computed('severity') get severityColor() {
        const severityColors = {
            critical: 'text-red-600 dark:text-red-400',
            high: 'text-orange-600 dark:text-orange-400',
            medium: 'text-yellow-600 dark:text-yellow-400',
            low: 'text-blue-600 dark:text-blue-400',
            info: 'text-gray-600 dark:text-gray-400',
        };
        return severityColors[this.severity] || severityColors['info'];
    }

    /** @computed - Status styling */
    @computed('status', 'isAcknowledged', 'isResolved') get statusBadgeClass() {
        if (this.isResolved) {
            return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
        }
        if (this.isAcknowledged) {
            return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
        }
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
    }

    @computed('status', 'isAcknowledged', 'isResolved') get statusText() {
        if (this.isResolved) return 'Resolved';
        if (this.isAcknowledged) return 'Acknowledged';
        return 'Pending';
    }

    @computed('status', 'isAcknowledged', 'isResolved') get statusIcon() {
        if (this.isResolved) return 'fas fa-check-circle';
        if (this.isAcknowledged) return 'fas fa-eye';
        return 'fas fa-bell';
    }

    /** @computed - Type styling */
    @computed('type') get typeIcon() {
        const typeIcons = {
            maintenance: 'fas fa-wrench',
            temperature: 'fas fa-thermometer-half',
            fuel: 'fas fa-gas-pump',
            speed: 'fas fa-tachometer-alt',
            location: 'fas fa-map-marker-alt',
            system: 'fas fa-cog',
            security: 'fas fa-shield-alt',
            performance: 'fas fa-chart-line',
            compliance: 'fas fa-clipboard-check',
        };
        return typeIcons[this.type] || 'fas fa-bell';
    }

    @computed('type') get typeBadgeClass() {
        const typeClasses = {
            maintenance: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
            temperature: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
            fuel: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
            speed: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
            location: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
            system: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
            security: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
            performance: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300',
            compliance: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300',
        };
        return typeClasses[this.type] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }

    /** @computed - Subject information */
    @computed('subject_type') get subjectTypeFormatted() {
        if (!this.subject_type) return 'Unknown';

        // Convert from model class name to human readable
        const typeMap = {
            vehicle: 'Vehicle',
            driver: 'Driver',
            order: 'Order',
            device: 'Device',
            asset: 'Asset',
            maintenance: 'Maintenance',
            fuel_report: 'Fuel Report',
        };

        return typeMap[this.subject_type] || this.subject_type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
    }

    /** @computed - Priority and urgency */
    @computed('severity', 'ageMinutes') get urgencyLevel() {
        const severityWeight = {
            critical: 4,
            high: 3,
            medium: 2,
            low: 1,
            info: 0,
        };

        const weight = severityWeight[this.severity] || 0;
        const ageHours = this.ageMinutes / 60;

        // Calculate urgency based on severity and age
        if (weight >= 3 && ageHours > 1) return 'urgent';
        if (weight >= 2 && ageHours > 4) return 'urgent';
        if (weight >= 3) return 'high';
        if (weight >= 2) return 'medium';
        return 'low';
    }

    @computed('urgencyLevel') get urgencyBadgeClass() {
        const urgencyClasses = {
            urgent: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300 animate-pulse',
            high: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
            medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
            low: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
        };
        return urgencyClasses[this.urgencyLevel] || urgencyClasses['low'];
    }

    /** @computed - Context information */
    @computed('context') get hasContext() {
        return !!(this.context && Object.keys(this.context).length > 0);
    }

    @computed('rule') get hasRule() {
        return !!(this.rule && Object.keys(this.rule).length > 0);
    }

    @computed('context.location') get hasLocation() {
        return !!this.context?.location;
    }

    @computed('context.value', 'rule.{operator,threshold}') get thresholdExceeded() {
        if (!this.context?.value || !this.rule?.threshold) return null;

        const value = parseFloat(this.context.value);
        const threshold = parseFloat(this.rule.threshold);
        const operator = this.rule.operator || '>';

        switch (operator) {
            case '>':
                return value > threshold;
            case '<':
                return value < threshold;
            case '>=':
                return value >= threshold;
            case '<=':
                return value <= threshold;
            case '==':
                return value === threshold;
            case '!=':
                return value !== threshold;
            default:
                return null;
        }
    }
}

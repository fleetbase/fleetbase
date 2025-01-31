import { isNone } from '@ember/utils';

export default function getIssueCategories(type = null, options) {
    const issueCategories = {
        vehicle: ['Mechanical Problems', 'Cosmetic Damages', 'Tire Issues', 'Electronics and Instruments', 'Maintenance Alerts', 'Fuel Efficiency Issues'],
        driver: ['Behavior Concerns', 'Documentation', 'Time Management', 'Communication', 'Training Needs', 'Health and Safety Violations'],
        route: ['Inefficient Routes', 'Safety Concerns', 'Blocked Routes', 'Environmental Considerations', 'Unfavorable Weather Conditions'],
        'payload-cargo': ['Damaged Goods', 'Misplaced Goods', 'Documentation Issues', 'Temperature-Sensitive Goods', 'Incorrect Cargo Loading'],
        'software-technical': ['Bugs', 'UI/UX Concerns', 'Integration Failures', 'Performance', 'Feature Requests', 'Security Vulnerabilities'],
        operational: ['Compliance', 'Resource Allocation', 'Cost Overruns', 'Communication', 'Vendor Management Issues'],
        customer: ['Service Quality', 'Billing Discrepancies', 'Communication Breakdown', 'Feedback and Suggestions', 'Order Errors'],
        security: ['Unauthorized Access', 'Data Concerns', 'Physical Security', 'Data Integrity Issues'],
        'environmental-sustainability': ['Fuel Consumption', 'Carbon Footprint', 'Waste Management', 'Green Initiatives Opportunities'],
    };

    if (!isNone(type) && typeof type === 'object' && options === undefined) {
        options = type;
    }

    if (!isNone(options) && typeof options === 'object' && options.fullObject === true) {
        return issueCategories;
    }

    if (type) {
        return issueCategories[type] || [];
    }

    const allIssueCategories = Object.values(issueCategories).flat();
    return allIssueCategories;
}

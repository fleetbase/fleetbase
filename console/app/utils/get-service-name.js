export default function getServiceName(serviceName) {
    if (serviceName.toLowerCase().startsWith('fleet')) {
        return 'Fleet Ops';
    }

    if (serviceName.toLowerCase().startsWith('iam') || serviceName.toLowerCase().startsWith('identity')) {
        return 'IAM';
    }

    if (serviceName.toLowerCase().startsWith('auth')) {
        return 'Auth';
    }

    if (serviceName === 'developers' || serviceName.toLowerCase().startsWith('developers')) {
        return 'Developers Console';
    }

    return 'N/A';
}

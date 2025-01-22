export default function getInt(subject, property) {
    return typeof subject === 'object' && Object.prototype.hasOwnProperty.call(subject, property) ? parseInt(subject[property]) : 0;
}

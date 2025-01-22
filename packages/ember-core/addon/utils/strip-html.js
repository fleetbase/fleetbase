export default function stripHtml(string) {
    return string.replace(/<\/?[^>]+(>|$)/g, '');
}

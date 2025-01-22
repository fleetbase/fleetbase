export default function generateSlug(length = 12) {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let slug = '';

    for (let i = 0; i < length; i++) {
        const index = Math.floor(Math.random() * chars.length);
        slug += chars[index];
    }

    return slug;
}

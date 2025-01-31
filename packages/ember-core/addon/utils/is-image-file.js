export default function isImageFile(type) {
    return /image|jpg|jpeg|png|gif|webp/i.test(type);
}

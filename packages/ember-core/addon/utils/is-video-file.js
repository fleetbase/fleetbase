export default function isVideoFile(type) {
    return /video|mp4|mov|wmv|avi|flv/i.test(type);
}

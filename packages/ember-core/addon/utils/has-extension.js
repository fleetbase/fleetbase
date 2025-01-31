export default function hasExtension(pkg) {
    let has = true;

    try {
        require(pkg);
    } catch {
        has = false;
    }

    return has;
}

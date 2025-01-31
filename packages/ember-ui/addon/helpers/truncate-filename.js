import { helper } from '@ember/component/helper';

export default helper(function truncateFilename([filename, maxLength = 20]) {
    if (!filename || typeof filename !== 'string' || filename.length <= maxLength) {
        return filename;
    }

    const extensionMatch = filename.match(/\.(.+)$/);
    const extension = extensionMatch ? extensionMatch[0] : '';
    const baseName = filename.slice(0, -extension.length);

    if (maxLength <= extension.length) {
        // If the maximum length is less than or equal to the extension's length, return only the extension
        return `...${extension}`;
    }

    const truncated = baseName.slice(0, maxLength - extension.length - 3) + '...';

    return truncated + extension;
});

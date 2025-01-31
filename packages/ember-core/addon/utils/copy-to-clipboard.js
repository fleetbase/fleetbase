export default function copyToClipboard(value) {
    const fallbackCopyToClipboard = (value) => {
        return new Promise((resolve, reject) => {
            const textArea = document.createElement('textarea');
            textArea.value = value;

            // Avoid scrolling to bottom
            textArea.style.top = '0';
            textArea.style.left = '0';
            textArea.style.position = 'fixed';

            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();

            try {
                document.execCommand('copy');
                resolve(value);
            } catch (error) {
                reject(new Error(error));
            }

            document.body.removeChild(textArea);
        });
    };

    const _copyToClipboard = (value) => {
        if (!navigator.clipboard) {
            return fallbackCopyToClipboard(value);
        }
        return navigator.clipboard.writeText(value);
    };

    return _copyToClipboard(value);
}

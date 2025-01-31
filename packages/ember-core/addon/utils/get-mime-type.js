export default function getMimeType(fileName) {
    const map = {
        pdf: 'application/pdf',
        zip: 'application/zip',
        doc: 'application/msword',
        xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        png: 'image/png',
        jpeg: 'image/jpg',
        jpg: 'image/jpg',
        csv: 'text/csv',
    };

    const extensions = Object.keys(map);

    for (let index = 0; index < extensions.length; index++) {
        const ext = extensions.objectAt(index);

        if (fileName.endsWith(ext)) {
            return ext;
        }
    }

    return null;
}

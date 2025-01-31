import { UploadFile } from 'ember-file-upload';

export default function isUploadFile(file) {
    return file instanceof UploadFile;
}

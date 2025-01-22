import getModelName from './get-model-name';

export default function getModelSavePermission(service, model) {
    const modelName = getModelName(model);
    const ability = model && model.isNew ? 'create' : 'update';
    return `${service} ${ability} ${modelName}`;
}

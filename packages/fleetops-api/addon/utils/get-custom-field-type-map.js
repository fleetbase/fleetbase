export default function getCustomFieldTypeMap() {
    return {
        input: {
            component: 'input',
        },
        phoneInput: {
            component: 'phone-input',
        },
        moneyInput: {
            component: 'money-input',
        },
        dateTimeInput: {
            component: 'date-time-input',
        },
        radioButton: {
            component: 'radio-button-select',
            hasOptions: true,
        },
        select: {
            component: 'select',
            hasOptions: true,
        },
        // modelSelect: {
        //     allowedModels: ['driver', 'contact', 'vendor', 'place', 'issue', 'fuel-report'],
        //     component: 'model-select',
        // },
        fileUpload: {
            component: 'file-upload',
        },
        // dropzone: {
        //     component: 'file-dropzone',
        // },
    };
}

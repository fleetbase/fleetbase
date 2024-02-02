import { helper } from '@ember/component/helper';

export default helper(function spreadWidgetOptions([params]) {
    const { id, options } = params;
    return { id, ...options };
});

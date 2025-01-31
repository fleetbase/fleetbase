export default function arg(target, key, descriptor) {
    return {
        get() {
            const argValue = this.args[key];
            return argValue !== undefined ? argValue : descriptor.initializer ? descriptor.initializer.call(this) : undefined;
        },
    };
}

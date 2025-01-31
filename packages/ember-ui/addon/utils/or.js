export default function or() {
    for (let i = 0; i < arguments.length; i++) {
        if (arguments[i] === undefined || arguments[i] === null) {
            continue;
        }

        return arguments[i];
    }
}

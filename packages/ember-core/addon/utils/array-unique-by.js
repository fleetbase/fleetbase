export default function arrayUniqueBy(arr, key) {
    return arr.reduce((unique, item) => {
        if (!unique.some((existingItem) => existingItem[key] === item[key])) {
            unique.push(item);
        }
        return unique;
    }, []);
}

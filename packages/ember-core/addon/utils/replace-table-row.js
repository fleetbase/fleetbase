import { get } from '@ember/object';

export default function replaceTableRow(table, newRow, findBy) {
    const rows = table.rows.content;
    let rowIndex = false;
    if (typeof findBy === 'string') {
        rowIndex = rows.findIndex((row) => get(row, findBy) === get(newRow, findBy));
    } else if (typeof findBy === 'function') {
        rowIndex = rows.findIndex(findBy);
    }
    if (rowIndex) {
        table.removeRowAt(rowIndex);
        table.insertRowAt(rowIndex, newRow);
        return true;
    }
    return false;
}

import groupBy from './group-by';
import { _range } from './range';
import { format, startOfMonth, endOfMonth, addDays } from 'date-fns';

function randomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min) + min);
}

function randomDateThisMonth() {
    const now = new Date();
    const startDate = startOfMonth(now);
    const endDate = endOfMonth(now);
    const diffInDays = (endDate - startDate) / (1000 * 60 * 60 * 24);
    return addDays(startDate, randomInt(0, diffInDays));
}

function makeMockDataset(start, end, dateProperty = 'created_at') {
    const data = _range(start, end).map(() => {
        return {
            created_at: randomDateThisMonth(),
        };
    });
    const grouped = groupBy(data, (record) => {
        return format(new Date(record[dateProperty]), 'MMMM, dd yyyy');
    });
    const dataset = [];

    for (let day in grouped) {
        dataset.pushObject({
            t: new Date(`${day} 00:00:00`),
            y: grouped[day].length,
        });
    }

    return dataset.sortBy('t');
}

export { makeMockDataset, randomInt, randomDateThisMonth, _range as range };

export default function makeDataset(recordArray, filter = Boolean, dateProperty = 'created_at') {
    const filteredData = recordArray.filter(filter);
    const grouped = groupBy(filteredData, (record) => {
        return format(new Date(record[dateProperty]), 'MMMM, dd yyyy');
    });
    const dataset = [];

    for (let day in grouped) {
        dataset.pushObject({
            t: new Date(`${day} 00:00:00`),
            y: grouped[day].length,
        });
    }

    return dataset.sortBy('t');
}

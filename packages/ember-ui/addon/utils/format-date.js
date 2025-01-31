import { format } from 'date-fns';

export default function formatDate(dateInstance, formatString = 'PPP p') {
    return format(dateInstance, formatString);
}

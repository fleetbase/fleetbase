import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';

/**
 * A reusable date-time format component that converts dates to a more readable format
 * Converts from MM/DD/YYYY HH:MM to Month DD, YYYY HH:MM
 * 
 * @class DateTimeFormatComponent
 * @extends {Component}
 */
export default class DateTimeFormatComponent extends Component {
    /**
     * Format the date from MM/DD/YYYY HH:MM to Month DD, YYYY HH:MM
     *
     * @method formattedDate
     * @return {String}
     */
    get formattedDate() {
        // Get the date string from args or use empty string
        const dateString = this.args.date || '';
        
        // Return empty string if no date is provided
        if (!dateString) {
            return '';
        }

        try {
            // Parse the input date (expecting format like "12/2/2024 18:06")
            const parts = dateString.split(' ');
            
            if (parts.length !== 2) {
                return dateString; // Return original if format doesn't match
            }
            
            const datePart = parts[0];
            const timePart = parts[1];
            
            // Split date into components
            const [month, day, year] = datePart.split('/');
            
            // Create a Date object (month is 0-indexed in JS Date)
            const date = new Date(year, parseInt(month, 10) - 1, day);
            
            // Get month name
            const monthNames = [
                'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
            ];
            const monthName = monthNames[date.getMonth()];
            
            // Format the date as "Feb 12, 2024 18:06"
            return `${monthName} ${parseInt(day, 10)}, ${year} ${timePart}`;
        } catch (error) {
            console.error('Error formatting date:', error);
            return dateString; // Return original on error
        }
    }
}
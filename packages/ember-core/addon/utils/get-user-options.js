/**
 * Retrieves user options from local storage.
 *
 * Attempts to read the user options stored in local storage as a JSON string under the key
 * USER_OPTIONS_STORAGE_KEY. If the JSON parsing fails, an empty object is returned.
 *
 * @returns {Object} The user options as an object, or an empty object if no valid user options were found.
 * @throws Will not throw an error, even if JSON parsing fails. Errors are silently caught and ignored.
 */
export default function getUserOptions() {
    const USER_OPTIONS_STORAGE_KEY = '@fleetbase/storage:user-options';

    try {
        const storedValue = window.localStorage.getItem(USER_OPTIONS_STORAGE_KEY);
        return storedValue ? JSON.parse(storedValue) : {};
    } catch (error) {
        // For debugging purposes, you can log the error (optional)
        // console.error('Failed to parse user options from local storage:', error);
        return {};
    }
}

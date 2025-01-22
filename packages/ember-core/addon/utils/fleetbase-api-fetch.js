import config from 'ember-get-config';

export default async function fleetbaseApiFetch(method, uri, params = {}, fetchOptions = {}) {
    // Prepare base URL
    const baseUrl = `${config.API.host}/${fetchOptions.namespace ?? config.API.namespace}`;

    // Initialize headers
    const headers = {
        'Content-Type': 'application/json',
    };

    // Check localStorage for the session data
    const localStorageSession = JSON.parse(window.localStorage.getItem('ember_simple_auth-session'));
    let token;
    if (localStorageSession) {
        const { authenticated } = localStorageSession;
        if (authenticated) {
            token = authenticated.token;
        }
    }

    // Set Authorization header if token is available
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    // Configure request options
    const options = {
        method,
        headers,
    };

    // Handle params based on method
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) && params) {
        options.body = JSON.stringify(params);
    } else if (method === 'GET' && params) {
        // Add params to URL for GET requests
        const urlParams = new URLSearchParams(params).toString();
        uri += `?${urlParams}`;
    }

    try {
        // Make the fetch request
        const response = await fetch(`${baseUrl}/${uri}`, options);

        // Check if the response is OK (status in the range 200-299)
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        // Parse and return the JSON response
        return await response.json();
    } catch (error) {
        // If a fallback response is provided use it instead
        if (fetchOptions && fetchOptions.fallbackResponse !== undefined) {
            return fetchOptions.fallbackResponse;
        }

        // Handle errors (network errors, JSON parsing errors, etc.)
        console.error('Error making request:', error);
        throw error;
    }
}

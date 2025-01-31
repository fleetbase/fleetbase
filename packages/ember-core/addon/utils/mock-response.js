export default function mockResponse() {
    const response = [];
    response.meta = {
        current_page: 1,
        from: 1,
        last_page: 1,
        per_page: 25,
        to: 1,
        total: 1,
    };

    return new Promise((resolve) => {
        resolve(response);
    });
}

// app/services/request-middleware.js
import Service from '@ember/service';
import { inject as service } from '@ember/service';

export default class RequestMiddlewareService extends Service {
  @service currentUser;
  
  constructor() {
    super(...arguments);
    this.setupFetchMiddleware();
  }
  
  setupFetchMiddleware() {
    const originalFetch = window.fetch;
    const service = this;
    
    window.fetch = function(url, options = {}) {
      return service.applyMiddleware(url, options).then(modifiedOptions => {
        return originalFetch(url, modifiedOptions);
      });
    };
  }
  
  async applyMiddleware(url, options = {}) {
    options = options || {};
    options.headers = options.headers || {};
    const fullLocale = this.currentUser.getOption('locale', 'en-us');
    const shortLocale = fullLocale.substring(0, 2);
    // Add X-locale header
    options.headers['X-Locale'] = shortLocale;
    
    return options;
  }

  // In your fetch service
async post(endpoint, data = {}, options = {}) {
    options = options || {};
    options.method = 'POST';
    options.body = JSON.stringify(data);
    
    // Use window.fetch to ensure middleware applies
    return window.fetch(endpoint, options).then((response) => response.json());
  }
}
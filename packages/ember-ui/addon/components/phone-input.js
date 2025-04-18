import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import intlTelInput from 'intl-tel-input';

export default class PhoneInputComponent extends Component {
    @service fetch;
    @tracked iti;

    @action setupIntlTelInput(element) {
        this.iti = intlTelInput(element, {
            containerClass: `w-full ${this.args.wrapperClass ?? ''}`,
            initialCountry: 'gb',
            separateDialCode: true,
            formatAsYouType: true,
            geoIpLookup: (success, failure) => {
                this.fetch
                    .get('lookup/whois')
                    .then((response) => {
                        success(response.country_code);
                    })
                    .catch(failure);
            },
            utilsScript: '/assets/libphonenumber/utils.js',
        });
       
        // Store a reference to element and iti for use in the timeout
    const phoneInput = element;
    const iti = this.iti;
    
    // IMPORTANT: Use a timeout to ensure the plugin is fully initialized
    setTimeout(() => {
        if (!phoneInput.value || phoneInput.value === '+' || phoneInput.value === '') {
            // Set country first
            iti.setCountry('gb');
            
            // Then set number with the plugin's method
            iti.setNumber('+44');
            
            // Also set the input value directly as a fallback
            phoneInput.value = '+44';
            
            // Trigger event to update bindings
            phoneInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
    }, 100); // 100ms delay should be enough
         // Set the default country and number after initialization
        // if (!element.value || element.value === '+' || element.value === '') {
        //     this.setPhoneNumber('+44'); // Ensure +44 is set as the default number
        // }
        // Re-initialize on input change
        // this.iti.setNumber('+44'); // Ensure the number is always set correctly on input change as well
        if (typeof this.args.onInit === 'function') {
            this.args.onInit(this.iti);
        }
        element.addEventListener('keydown', (event) => {
            // Check if backspace/delete is pressed and would remove the +
            if ((event.key === 'Backspace' || event.key === 'Delete') && 
                (element.value === '+' || 
                 (element.selectionStart <= 1 && element.selectionEnd <= 1))) {
                // Prevent the default action (deleting the +)
                event.preventDefault();
            }
        });
        element.addEventListener('countrychange', this.args.onCountryChange);
    }

    @action onInput() {
        const { onInput } = this.args;
        const number = this.iti.getNumber(intlTelInput.utils.numberFormat.E164);

        if (typeof onInput === 'function') {
            onInput(number, ...arguments);
        }
    }

   
    @action handleInput(event) {
        let inputValue = event.target.value;
        const previousValue = event.target.dataset.previousValue || '+';
        
        // Get the selected country code
        let dialCode = '';
        
        const selectedCountryButton = document.querySelector('.iti__selected-country');
        if (selectedCountryButton) {
            const dialCodeElement = selectedCountryButton.querySelector('.iti__selected-dial-code');
            if (dialCodeElement) {
                dialCode = dialCodeElement.textContent.trim().replace(/^\+/, '');
            } else {
                const a11yElement = selectedCountryButton.querySelector('.iti__a11y-text');
                if (a11yElement) {
                    const match = a11yElement.textContent.match(/\+(\d+)$/);
                    if (match && match[1]) {
                        dialCode = match[1];
                    }
                }
            }
        }
        
        // Case 1: Empty field - use the plugin to set the number
        if (!inputValue || inputValue === '') {
            const countryData = this.iti.getSelectedCountryData();
            this.iti.setNumber(`+${countryData.dialCode}`);
            return; // Exit early
        } 
        // Case 2: If + is missing, ALWAYS add it back
        else if (!inputValue.startsWith('+')) {
            // This is the key change - always add the + back, regardless of what the user did
            inputValue = '+' + inputValue.replace(/[^0-9]/g, '');
        }
        // Case 3: Already has + - just ensure only numbers after it
        else {
            inputValue = '+' + inputValue.substring(1).replace(/[^0-9]/g, '');
        }
        
        // Store current value for next comparison
        event.target.dataset.previousValue = inputValue;
        
        // Update the input value
        event.target.value = inputValue;
        
        // Update country flag based on input
        if (inputValue.length > 1) {
            this.detectAndUpdateCountry(inputValue);
        }
    }
    @action detectAndUpdateCountry(phoneNumber) {
        // Country code mapping
        const countryCodes = {
            '1': 'us',     // United States/Canada
            '44': 'gb',    // United Kingdom
            '91': 'in',    // India
            '376': 'ad',   // Andorra
            '40': 'ro',    // Romania
            // Add more as needed
        };
        
        // Extract digits after +
        const digits = phoneNumber.substring(1);
        
        // Find the longest matching country code
        let matchedCountry = null;
        let matchLength = 0;
        
        for (const [code, country] of Object.entries(countryCodes)) {
            if (digits.startsWith(code) && code.length > matchLength) {
                matchedCountry = country;
                matchLength = code.length;
            }
        }
        
        // Update the flag if we found a match
        if (matchedCountry) {
            this.updateCountryDisplay(matchedCountry);
        }
    }
    @action updateCountryDisplay(countryCode) {
        // Get the country selector/display elements
        const countrySelect = document.querySelector('.country-select');
        const flagElement = document.querySelector('.selected-flag');
        
        // Update the dropdown if it exists
        if (countrySelect && countrySelect.value !== countryCode) {
            countrySelect.value = countryCode;
            countrySelect.dispatchEvent(new Event('change', { bubbles: true }));
        }
        
        // Update the flag display if it exists
        if (flagElement) {
            // For image-based flags
            const flagImg = flagElement.querySelector('img');
            if (flagImg) {
                flagImg.src = `/assets/flags/${countryCode.toLowerCase()}.png`;
                flagImg.alt = countryCode.toUpperCase();
            }
            // For CSS-based flags (className approach)
            else {
                // Remove any existing flag classes
                const classes = [...flagElement.classList];
                const flagClass = classes.find(c => c.startsWith('flag-'));
                if (flagClass) {
                    flagElement.classList.remove(flagClass);
                }
                // Add the new flag class
                flagElement.classList.add(`flag-${countryCode.toLowerCase()}`);
            }
        }
    }
  
    
}

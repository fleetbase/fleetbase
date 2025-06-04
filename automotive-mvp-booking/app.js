const { createApp } = Vue;

createApp({
  data() {
    return {
      customer: { name: '', email: '', phone: '' },
      vehicle: { make: '', model: '', year: null, color: '', licensePlate: '', notes: '' },
      availableServices: [
        { id: 'oil_sedan', name: 'Standard Oil Change (Sedan/Hatchback)', price: 49.99 },
        { id: 'oil_suv', name: 'Standard Oil Change (SUV/Truck)', price: 69.99 },
        { id: 'tire_rotation', name: 'Tire Rotation', price: 29.99 },
        { id: 'battery_check_replace', name: 'Battery Check & Replacement (Labor Only)', price: 39.99 }
      ],
      selectedServiceId: null,
      location: { street: '', city: '', state: '', zip: '', notes: '' },
      bookingDateTime: { date: '', selectedTimeSlotId: null },
      availableTimeSlots: [
        { id: 'morning', name: 'Morning (9 AM - 12 PM)' },
        { id: 'afternoon', name: 'Afternoon (1 PM - 5 PM)' }
      ],
      bookingSubmitted: false,
      simulatedBookingId: null // New property for simulated Booking ID
    };
  },
  computed: {
    minDate() {
      const today = new Date();
      // Set hours, minutes, seconds, and milliseconds to 0 to compare dates only
      today.setHours(0, 0, 0, 0);
      // Format to YYYY-MM-DD for the input type="date" min attribute
      let month = (today.getMonth() + 1).toString().padStart(2, '0');
      let day = today.getDate().toString().padStart(2, '0');
      return `${today.getFullYear()}-${month}-${day}`;
    },
    selectedServiceDetails() {
      if (!this.selectedServiceId) {
        return null;
      }
      return this.availableServices.find(service => service.id === this.selectedServiceId);
    },
    totalQuote() {
      if (this.selectedServiceDetails) {
        return this.selectedServiceDetails.price;
      }
      return 0;
    }
  },
  methods: {
    submitBooking() {
      // Prevent default form submission is handled by @submit.prevent in HTML

      // Basic validation check (more can be added)
      if (!this.selectedServiceId || !this.bookingDateTime.date || !this.bookingDateTime.selectedTimeSlotId) {
        alert('Please select a service, a date, and a time slot.');
        return;
      }
      if (!this.customer.name || !this.customer.email || !this.customer.phone ||
          !this.vehicle.make || !this.vehicle.model || !this.vehicle.year ||
          !this.location.street || !this.location.city || !this.location.state || !this.location.zip) {
        alert('Please fill in all required customer, vehicle, and location fields.');
        return;
      }

      const bookingPayload = {
        customer: this.customer,
        vehicle: this.vehicle,
        service: this.selectedServiceDetails, // Contains name, id, price
        location: this.location,
        bookingDateTime: {
            date: this.bookingDateTime.date,
            timeSlotId: this.bookingDateTime.selectedTimeSlotId,
            timeSlotDetails: this.availableTimeSlots.find(slot => slot.id === this.bookingDateTime.selectedTimeSlotId) || null
        },
        totalPrice: this.totalQuote
      };

      console.log('--- Booking Submission ---');
      console.log('Customer:', this.customer);
      console.log('Vehicle:', this.vehicle);
      console.log('Selected Service:', this.selectedServiceDetails);
      console.log('Location:', this.location);
      console.log('Date & Time Slot:', bookingPayload.bookingDateTime);
      console.log('Total Quote:', this.totalQuote);
      console.log('--- Payload for API (Simulated) ---');
      console.log(JSON.stringify(bookingPayload, null, 2));

      alert('Booking request submitted successfully (simulated)! Check console for details.');
      this.bookingSubmitted = true;
      this.simulatedBookingId = 'MVP-' + Date.now(); // Set simulated booking ID
    },
    resetFormForNewBooking() {
      this.customer = { name: '', email: '', phone: '' };
      this.vehicle = { make: '', model: '', year: null, color: '', licensePlate: '', notes: '' };
      this.selectedServiceId = null;
      this.location = { street: '', city: '', state: '', zip: '', notes: '' };
      this.bookingDateTime = { date: '', selectedTimeSlotId: null };
      this.bookingSubmitted = false;
      this.simulatedBookingId = null;
    }
  }
}).mount('#app');

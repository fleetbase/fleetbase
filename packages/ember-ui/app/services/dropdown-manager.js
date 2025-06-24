// app/services/dropdown-manager.js
// Create this file in your app/services/ directory
import Service from '@ember/service';
import { tracked } from '@glimmer/tracking';

export default class DropdownManagerService extends Service {
  @tracked currentOpenDropdown = null;

  openDropdown(componentInstance) {
    // Close the previously open dropdown
    if (this.currentOpenDropdown && this.currentOpenDropdown !== componentInstance) {
      this.currentOpenDropdown.closeDropdown();
    }
    
    this.currentOpenDropdown = componentInstance;
  }

  closeDropdown(componentInstance) {
    if (this.currentOpenDropdown === componentInstance) {
      this.currentOpenDropdown = null;
    }
  }

  closeAllDropdowns() {
    if (this.currentOpenDropdown) {
      this.currentOpenDropdown.closeDropdown();
      this.currentOpenDropdown = null;
    }
  }
}
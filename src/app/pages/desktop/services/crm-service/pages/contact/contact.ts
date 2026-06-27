import { CommonModule } from '@angular/common';
import { Component, HostListener } from '@angular/core';
import { FormControl, FormsModule } from '@angular/forms';

@Component({
  selector: 'app-contact',
  imports: [CommonModule, FormsModule],
  templateUrl: './contact.html',
  styleUrl: './contact.css',
})
export class Contact {
  currentView: 'grid' | 'list' = 'grid';
  isEditMode = false;
  showDetailsModal = false;
  windowWidth = window.innerWidth;

  // Data
  contacts: any[] = [];
  filteredContacts: any[] = [];
  selectedContact: any = null;

  // Filters
  searchTerm = '';
  statusFilter = '';
  sourceFilter = '';

  // Form model
  contactModel: any = {};
  newOption: any = { label: '', value: '' };

  constructor() {
    this.loadSampleData();
    this.filterContacts();
  }

  @HostListener('window:resize')
  onResize() {
    this.windowWidth = window.innerWidth;
  }

  loadSampleData() {
    this.contacts = [
      {
        id: 'c8a1f2b0-1234-4cde-9a2b-56789abcdef0',
        fullName: 'Rahul Sharma',
        email: 'rahul.sharma@gmail.com',
        phone: '9999999999',
        companyName: 'ABC Pvt Ltd',
        accountId: 'ACC101',
        status: 'ACTIVE',
        source: 'Website',
        address: '',
        notes: 'Interested in multiple products including CRM and WhatsApp API',
        createdAt: '2026-03-17T10:30:00Z',
        updatedAt: '2026-03-17T12:00:00Z',
        createdBy: 'user-uuid-123',
        updatedBy: 'user-uuid-123'
      },
      {
        id: 'd9b2g3c1-2345-5def-0b3c-67890abcdef1',
        fullName: 'Priya Patel',
        email: 'priya.patel@techsolutions.com',
        phone: '8888888888',
        companyName: 'Tech Solutions Inc',
        accountId: 'ACC102',
        status: 'LEAD',
        source: 'Referral',
        address: '123 Business Park, Mumbai',
        notes: 'Follow up on proposal sent',
        createdAt: '2026-03-16T09:00:00Z',
        updatedAt: '2026-03-16T15:30:00Z',
        createdBy: 'user-uuid-123',
        updatedBy: 'user-uuid-456'
      }
    ];
  }

  // View management
  setView(view: 'grid' | 'list') {
    this.currentView = view;
    if (view === 'list') this.selectedContact = null;
  }

  // CRUD operations
  addContact() {
    this.isEditMode = true;
    this.selectedContact = null;
    this.contactModel = {
      fullName: '',
      email: '',
      phone: '',
      companyName: '',
      accountId: '',
      status: 'ACTIVE',
      source: 'Website',
      address: '',
      notes: '',
      createdBy: 'current-user',
      updatedBy: 'current-user'
    };
  }

  editContact(contact: any) {
    this.selectedContact = contact;
    this.isEditMode = true;
    this.contactModel = { ...contact };
  }

  viewContact(contact: any) {
    this.selectedContact = contact;
    this.showDetailsModal = true;
  }

  deleteContact(id: string) {
    if (confirm('Are you sure you want to delete this contact?')) {
      this.contacts = this.contacts.filter(c => c.id !== id);
      this.filterContacts();
      if (this.selectedContact?.id === id) {
        this.selectedContact = null;
        this.showDetailsModal = false;
      }
    }
  }

  selectContact(contact: any) {
    this.selectedContact = contact;
    if (this.windowWidth < 768) {
      this.showDetailsModal = true;
    }
  }

  onSubmit() {
    if (this.selectedContact) {
      // Update
      const index = this.contacts.findIndex(c => c.id === this.selectedContact.id);
      if (index !== -1) {
        this.contacts[index] = {
          ...this.contactModel,
          id: this.selectedContact.id,
          updatedAt: new Date().toISOString()
        };
      }
    } else {
      // Create
      const newContact = {
        ...this.contactModel,
        id: this.generateUUID(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      this.contacts.push(newContact);
    }

    this.cancelEdit();
    this.filterContacts();
  }

  cancelEdit() {
    this.isEditMode = false;
    this.contactModel = {};
  }

  closeDetailsModal() {
    this.showDetailsModal = false;
    if (this.windowWidth < 768) {
      this.selectedContact = null;
    }
  }

  // Filtering
  filterContacts() {
    this.filteredContacts = this.contacts.filter(contact => {
      const matchesSearch = !this.searchTerm ||
        contact.fullName.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        contact.email.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        contact.companyName?.toLowerCase().includes(this.searchTerm.toLowerCase());

      const matchesStatus = !this.statusFilter || contact.status === this.statusFilter;
      const matchesSource = !this.sourceFilter || contact.source === this.sourceFilter;

      return matchesSearch && matchesStatus && matchesSource;
    });
  }

  clearFilters() {
    this.searchTerm = '';
    this.statusFilter = '';
    this.sourceFilter = '';
    this.filteredContacts = [...this.contacts];
  }

  // Helper methods
  getActiveContactsCount(): number {
    return this.contacts.filter(c => c.status === 'ACTIVE').length;
  }

  getUniqueCompaniesCount(): number {
    return new Set(this.contacts.map(c => c.companyName).filter(Boolean)).size;
  }

  getTodayAddedCount(): number {
    const today = new Date().toDateString();
    return this.contacts.filter(c => new Date(c.createdAt).toDateString() === today).length;
  }

  getInitials(name: string): string {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }

  getAvatarColor(name: string): string {
    const colors = [
      'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
      'linear-gradient(135deg, #fa709a 0%, #fee140 100%)'
    ];
    const index = name.length % colors.length;
    return colors[index];
  }

  exportContacts() {
    const dataStr = JSON.stringify(this.filteredContacts, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = `contacts_${new Date().toISOString().slice(0, 10)}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  }

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}

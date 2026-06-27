import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, ViewChild } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';


export interface AccountDetails {
  id: number;
  fullname: string;
  createBy: string;
  createAt: string;
  updateBy: string;
  updateAt: string;
  active: boolean;
  email: string;
  phone: string;
  hasTwoStepAuthencation: boolean;
  logo: string;
  company: string;
}

@Component({
  selector: 'app-account',
  imports: [CommonModule, FormsModule],
  templateUrl: './account.html',
  styleUrl: './account.css',
})
export class Account {
  windowWidth = window.innerWidth;
  accounts: AccountDetails[] = [];
  filteredAccounts: AccountDetails[] = [];
  selectedAccount: AccountDetails | null = null;
  searchTerm: string = '';
  isEditMode: boolean = false;
  currentView: 'grid' | 'list' = 'grid';
  showDetailsModal: boolean = false;

  accountModel: Partial<AccountDetails> = {};

  private mockAccounts: AccountDetails[] = [
    { id: 1, fullname: 'John Doe', company: 'Acme Inc', email: 'john@acme.com', phone: '1234567890', logo: '', active: true, hasTwoStepAuthencation: true, createBy: 'admin', createAt: '13-03-2026 10:30', updateBy: 'admin', updateAt: '13-03-2026 10:30' },
    { id: 2, fullname: 'Jane Smith', company: 'Tech Corp', email: 'jane@tech.com', phone: '9876543210', logo: '', active: true, hasTwoStepAuthencation: false, createBy: 'admin', createAt: '13-03-2026 11:00', updateBy: 'admin', updateAt: '13-03-2026 11:00' },
    { id: 3, fullname: 'Bob Wilson', company: 'Global Ltd', email: 'bob@global.com', phone: '5551234567', logo: '', active: false, hasTwoStepAuthencation: false, createBy: 'admin', createAt: '12-03-2026 09:15', updateBy: 'admin', updateAt: '13-03-2026 09:15' },
  ];

  ngOnInit() { this.loadAccounts(); }

  loadAccounts() {
    this.accounts = [...this.mockAccounts];
    this.filteredAccounts = [...this.accounts];
  }

  filterAccounts() {
    if (!this.searchTerm) this.filteredAccounts = [...this.accounts];
    else {
      const term = this.searchTerm.toLowerCase();
      this.filteredAccounts = this.accounts.filter(a =>
        a.fullname.toLowerCase().includes(term) ||
        a.company.toLowerCase().includes(term) ||
        a.email.toLowerCase().includes(term));
    }
  }

  setView(view: 'grid' | 'list') {
    this.currentView = view;
    if (view === 'list') this.selectedAccount = null;
  }

  selectAccount(acc: AccountDetails) { this.selectedAccount = acc; }

  viewAccountDetails(acc: AccountDetails) {
    this.selectedAccount = acc;
    this.showDetailsModal = true;
  }

  closeDetailsModal() {
    this.showDetailsModal = false;
    this.selectedAccount = null;
  }

  openNewAccountModal() {
    this.accountModel = { active: true, hasTwoStepAuthencation: false };
    this.isEditMode = true;
  }

  openEditForm(acc: AccountDetails) {
    this.accountModel = { ...acc };
    this.isEditMode = true;
    this.showDetailsModal = false;
  }

  closeModal() {
    this.isEditMode = false;
    this.accountModel = {};
    this.selectedAccount = null;
  }

  onSubmit() {
    if (this.selectedAccount) {
      const index = this.accounts.findIndex(a => a.id === this.selectedAccount!.id);
      if (index !== -1) {
        this.accounts[index] = { ...this.accounts[index], ...this.accountModel, updateAt: new Date().toLocaleString() } as AccountDetails;
      }
    } else {
      const newId = Math.max(...this.accounts.map(a => a.id), 0) + 1;
      const newAcc: AccountDetails = {
        id: newId,
        fullname: this.accountModel.fullname || '',
        company: this.accountModel.company || '',
        email: this.accountModel.email || '',
        phone: this.accountModel.phone || '',
        logo: this.accountModel.logo || '',
        active: this.accountModel.active || false,
        hasTwoStepAuthencation: this.accountModel.hasTwoStepAuthencation || false,
        createBy: this.accountModel.createBy || 'current-user',
        createAt: new Date().toLocaleString(),
        updateBy: this.accountModel.createBy || 'current-user',
        updateAt: new Date().toLocaleString()
      };
      this.accounts.push(newAcc);
    }
    this.loadAccounts();
    this.closeModal();
  }

  deleteAccount(id: number) {
    if (confirm('Delete account?')) {
      this.accounts = this.accounts.filter(a => a.id !== id);
      this.loadAccounts();
      if (this.selectedAccount?.id === id) this.selectedAccount = null;
      this.showDetailsModal = false;
    }
  }


  // Add resize listener
  @HostListener('window:resize')
  onResize() {
    this.windowWidth = window.innerWidth;
  }
}

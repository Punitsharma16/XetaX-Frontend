// users.component.ts
import { CommonModule } from '@angular/common';
import { Component, HostListener } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Provider, UserObject } from './userModel';
import { BaseService } from '../../../../../../acore/base/base.service';
import { UrlConstants } from '../../../../../../acore/util/url';
import { Loader } from '../../../../../../acore/components/loader/loader';

@Component({
  selector: 'app-user',
  imports: [CommonModule, FormsModule, Loader],
  templateUrl: './user.html',
  styleUrl: './user.css',
})
export class User {
  
  windowWidth = window.innerWidth;
  accounts: UserObject[] = [];
  filteredAccounts: UserObject[] = [];
  selectedAccount: UserObject | null = null;
  searchTerm: string = '';
  isEditMode: boolean = false;
  currentView: 'grid' | 'list' = 'grid';
  showDetailsModal: boolean = false;
  userModel: Partial<UserObject> = {};

  constructor(private service: BaseService) {

  }

  ngOnInit() { this.loadUsers(); }

  loadUsers() {
    this.service.showLoader();
    this.service.getDataFromAPI(UrlConstants.GET_ALL_USERS , "json" , true).subscribe({
      next: (res) => {
        console.log("The Response While Fetching Users -> " , res);
        
        this.accounts = res || [];
        console.log("The Accounts After Fetching Users -> " , this.accounts);
        this.service.hideLoader();
        
        // this.accounts = [...this.mockAccounts];
        this.filteredAccounts = [...this.accounts];
        
      },
      error: (err) => {
        console.log("The Error While Fetching Users -> " , err.message);
        this.service.hideLoader();
        
      }
    })
  }

  filterAccounts() {
    if (!this.searchTerm) this.filteredAccounts = [...this.accounts];
    else {
      const term = this.searchTerm.toLowerCase();
      this.filteredAccounts = this.accounts.filter(a =>
        a.name.toLowerCase().includes(term) ||
        a.company.toLowerCase().includes(term) ||
        a.email.toLowerCase().includes(term));
    }
  }

  setView(view: 'grid' | 'list') {
    this.currentView = view;
    if (view === 'list') this.selectedAccount = null;
  }

  selectAccount(acc: UserObject) { this.selectedAccount = acc; }

  viewAccountDetails(acc: UserObject) {
    this.selectedAccount = acc;
    this.showDetailsModal = true;
  }

  closeDetailsModal() {
    this.showDetailsModal = false;
    this.selectedAccount = null;
  }

  openNewAccountModal() {
    this.userModel = { enable: true, provider: Provider.LOCAL };
    this.isEditMode = true;
  }

  openEditForm(acc: UserObject) {
    this.userModel = { ...acc };
    this.isEditMode = true;
    this.showDetailsModal = false;
  }

  closeModal() {
    this.isEditMode = false;
    this.userModel = {};
    this.selectedAccount = null;
  }

  onSubmit() {
    this.service.showLoader();
    if (this.selectedAccount) {
      this.service.putDataFromApi(UrlConstants.UPDATE_USER + this.selectedAccount.id , this.userModel , "json" , true).subscribe({
        next: (res) => {
          console.log("The Response While Updating User -> " , res);
          this.loadUsers();
          this.service.hideLoader();
        },
        error: (err) => {
          this.service.hideLoader();
          console.log("The Error While Updating User -> " , err.message);
          
        }
      })
    } else {
      const newAcc = {
        name: this.userModel.name || '',
        company: this.userModel.company || '',
        email: this.userModel.email || '',
        phone: this.userModel.phone || '',
        enable: true,
        createAt: '',
        updateAt: '',
        password: this.userModel.password,
        isAdmin: false,
        provider: Provider.LOCAL,
      };
      this.service.postDataFromAPI(UrlConstants.CREATE_USER , newAcc , "json" , true).subscribe({
        next: (res) => {
          console.log("The Response While Updating User -> " , res);
          this.loadUsers();
          this.service.hideLoader();
        },
        error: (err) => {
          this.service.hideLoader();
          console.log("The Error While Updating User -> " , err.message);
          
        }
      })
    }
    this.closeModal();
  }

  deleteAccount(id: string) {
    // if (confirm('Delete account?')) {
    //   this.accounts = this.accounts.filter(a => a.id !== id);
    //   this.loadAccounts();
    //   if (this.selectedAccount?.id === id) this.selectedAccount = null;
    //   this.showDetailsModal = false;
    // }
  }


  // Add resize listener
  @HostListener('window:resize')
  onResize() {
    this.windowWidth = window.innerWidth;
  }
}
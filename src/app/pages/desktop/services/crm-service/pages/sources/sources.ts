import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, Validators, FormsModule } from '@angular/forms';

export interface Source {
  id: number;
  parentId?: number;
  name: string;
  description?: string;
  status: number; // 1 for active, 0 for inactive
  accessToken?: string;
  assignBy?: string;
  desc?: string; // Alternative description field
}

export interface LeadAllocation {
  id: number;
  leadSourceID: number;
  name: string;
  status: boolean;
  assignBy: string;
  description: string;
  option: string;
  allocationType: number;
  sendTextMessage: boolean;
  sendTextMessageOther: boolean;
  templateId: string;
  lastUserId: number;
  otherPhonenumbers: string;
  initialStage: string;
  initialStatus: string;
  allocationUser: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}
@Component({
  selector: 'app-sources',
  imports: [CommonModule, FormsModule],
  templateUrl: './sources.html',
  styleUrl: './sources.css',
})
export class Sources implements OnInit {
  windowWidth = window.innerWidth;
  sources: Source[] = [];
  filteredSources: Source[] = [];
  selectedSource: Source | null = null;
  searchTerm: string = '';
  isEditMode: boolean = false;
  isAllocationMode: boolean = false;
  sourceModel: Partial<Source> = {};
  currentView: 'grid' | 'list' = 'grid';
  
  // Lead allocation related
  allocations: LeadAllocation[] = [];
  selectedAllocation: LeadAllocation | null = null;
  allocationModel: Partial<LeadAllocation> = {};
  
  // Available users for assignment
  availableUsers: User[] = [
    { id: 1, name: 'John Doe', email: 'john@example.com', role: 'Sales Rep' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'Sales Manager' },
    { id: 3, name: 'Bob Wilson', email: 'bob@example.com', role: 'Team Lead' },
    { id: 4, name: 'Alice Johnson', email: 'alice@example.com', role: 'Sales Rep' },
    { id: 5, name: 'Charlie Brown', email: 'charlie@example.com', role: 'Sales Rep' }
  ];

  // Mock data based on your source object structure
  private mockSources: Source[] = [
    {
      id: 724698,
      parentId: 1,
      name: "Exhibition",
      description: "Exhibition",
      status: 1,
      accessToken: "3a9d3cda-6db7-473c-a1a5-08f6924f41f0",
      assignBy: "leadSource",
      desc: "Exhibition"
    },
    {
      id: 724699,
      parentId: 1,
      name: "Website",
      description: "Website leads",
      status: 1,
      accessToken: "4b9d3cda-6db7-473c-a1a5-08f6924f41f1",
      assignBy: "leadSource",
      desc: "Website"
    },
    {
      id: 724700,
      parentId: 2,
      name: "Referral",
      description: "Referral program",
      status: 1,
      accessToken: "5c9d3cda-6db7-473c-a1a5-08f6924f41f2",
      assignBy: "leadSource",
      desc: "Referral"
    },
    {
      id: 724701,
      parentId: 1,
      name: "Social Media",
      description: "Social media campaigns",
      status: 0,
      accessToken: "6d9d3cda-6db7-473c-a1a5-08f6924f41f3",
      assignBy: "leadSource",
      desc: "Social Media"
    },
    {
      id: 724702,
      parentId: 3,
      name: "Cold Call",
      description: "Cold calling campaigns",
      status: 1,
      accessToken: "7e9d3cda-6db7-473c-a1a5-08f6924f41f4",
      assignBy: "leadSource",
      desc: "Cold Call"
    }
  ];

  // Mock allocations
  private mockAllocations: LeadAllocation[] = [
    {
      id: 1,
      leadSourceID: 724698,
      name: "Exhibition Leads - Sales Team A",
      status: true,
      assignBy: "admin@system.com",
      description: "All exhibition leads go to Sales Team A",
      option: "round_robin",
      allocationType: 1,
      sendTextMessage: true,
      sendTextMessageOther: false,
      templateId: "temp_001",
      lastUserId: 3,
      otherPhonenumbers: "+1234567890",
      initialStage: "New Lead",
      initialStatus: "Uncontacted",
      allocationUser: "Team A"
    },
    {
      id: 2,
      leadSourceID: 724699,
      name: "Website Leads - Round Robin",
      status: true,
      assignBy: "admin@system.com",
      description: "Website leads distributed round-robin",
      option: "round_robin",
      allocationType: 2,
      sendTextMessage: true,
      sendTextMessageOther: true,
      templateId: "temp_002",
      lastUserId: 5,
      otherPhonenumbers: "",
      initialStage: "New Lead",
      initialStatus: "Uncontacted",
      allocationUser: "Individual Reps"
    }
  ];

  ngOnInit() {
    this.loadSources();
    this.loadAllocations();
  }

  loadSources() {
    this.sources = [...this.mockSources];
    this.filteredSources = [...this.sources];
  }

  loadAllocations() {
    this.allocations = [...this.mockAllocations];
  }

  filterSources() {
    if (!this.searchTerm) {
      this.filteredSources = [...this.sources];
    } else {
      const term = this.searchTerm.toLowerCase();
      this.filteredSources = this.sources.filter(source =>
        source.name.toLowerCase().includes(term) ||
        source.description?.toLowerCase().includes(term) ||
        source.desc?.toLowerCase().includes(term)
      );
    }
  }

  getActiveSourcesCount(): number {
    return this.sources.filter(s => s.status === 1).length;
  }

  selectSource(source: Source) {
    this.selectedSource = source;
    this.loadAllocationsForSource(source.id);
  }

  loadAllocationsForSource(sourceId: number) {
    this.allocations = this.mockAllocations.filter(a => a.leadSourceID === sourceId);
  }

  setView(view: 'grid' | 'list') {
    this.currentView = view;
    if (view === 'list') {
      this.selectedSource = null;
    }
  }

  @HostListener('window:resize')
  onResize() {
    this.windowWidth = window.innerWidth;
  }

  openNewSourceModal() {
    this.sourceModel = {
      status: 1,
      assignBy: 'leadSource',
      accessToken: this.generateUUID()
    };
    this.isEditMode = true;
    this.isAllocationMode = false;
  }

  openEditForm(source: Source) {
    this.sourceModel = { ...source };
    this.isEditMode = true;
    this.isAllocationMode = false;
    this.selectedSource = source;
  }

  // Lead Allocation Methods
  openAllocationModal(source: Source) {
    this.selectedSource = source;
    this.allocationModel = {
      leadSourceID: source.id,
      status: true,
      sendTextMessage: false,
      sendTextMessageOther: false,
      allocationType: 1,
      initialStage: "New Lead",
      initialStatus: "Uncontacted",
      option: "round_robin"
    };
    this.isAllocationMode = true;
    this.isEditMode = false;
    this.selectedAllocation = null;
  }

  editAllocation(allocation: LeadAllocation) {
    this.allocationModel = { ...allocation };
    this.selectedAllocation = allocation;
    this.isAllocationMode = true;
    this.isEditMode = false;
  }

  closeModal() {
    this.isEditMode = false;
    this.isAllocationMode = false;
    this.sourceModel = {};
    this.allocationModel = {};
    this.selectedSource = null;
    this.selectedAllocation = null;
  }

  onSubmit() {
    if (this.isEditMode) {
      this.saveSource();
    } else if (this.isAllocationMode) {
      this.saveAllocation();
    }
  }

  saveSource() {
    if (this.selectedSource) {
      // Update existing source
      const index = this.sources.findIndex(s => s.id === this.selectedSource!.id);
      if (index !== -1) {
        const updatedSource = {
          ...this.sources[index],
          ...this.sourceModel,
          status: this.sourceModel.status ? 1 : 0
        };
        this.sources[index] = updatedSource as Source;
      }
    } else {
      // Create new source
      const newSource: Source = {
        id: Math.floor(Math.random() * 1000000) + 700000,
        name: this.sourceModel.name || '',
        parentId: this.sourceModel.parentId,
        description: this.sourceModel.description,
        desc: this.sourceModel.description,
        status: this.sourceModel.status ? 1 : 0,
        accessToken: this.sourceModel.accessToken || this.generateUUID(),
        assignBy: this.sourceModel.assignBy || 'leadSource'
      };
      this.sources.push(newSource);
    }

    this.loadSources();
    this.closeModal();
  }

  saveAllocation() {
    if (this.selectedAllocation) {
      // Update existing allocation
      const index = this.mockAllocations.findIndex(a => a.id === this.selectedAllocation!.id);
      if (index !== -1) {
        this.mockAllocations[index] = {
          ...this.mockAllocations[index],
          ...this.allocationModel,
          status: this.allocationModel.status ? true : false
        } as LeadAllocation;
      }
    } else {
      // Create new allocation
      const newAllocation: LeadAllocation = {
        id: Math.floor(Math.random() * 1000) + 100,
        leadSourceID: this.selectedSource?.id || 0,
        name: this.allocationModel.name || '',
        status: this.allocationModel.status || true,
        assignBy: 'admin@system.com',
        description: this.allocationModel.description || '',
        option: this.allocationModel.option || 'round_robin',
        allocationType: this.allocationModel.allocationType || 1,
        sendTextMessage: this.allocationModel.sendTextMessage || false,
        sendTextMessageOther: this.allocationModel.sendTextMessageOther || false,
        templateId: this.allocationModel.templateId || '',
        lastUserId: this.allocationModel.lastUserId || 0,
        otherPhonenumbers: this.allocationModel.otherPhonenumbers || '',
        initialStage: this.allocationModel.initialStage || 'New Lead',
        initialStatus: this.allocationModel.initialStatus || 'Uncontacted',
        allocationUser: this.allocationModel.allocationUser || ''
      };
      this.mockAllocations.push(newAllocation);
    }

    this.loadAllocationsForSource(this.selectedSource?.id || 0);
    this.closeModal();
  }

  deleteSource(id: number) {
    if (confirm('Are you sure you want to delete this source?')) {
      this.sources = this.sources.filter(s => s.id !== id);
      this.loadSources();
      if (this.selectedSource?.id === id) {
        this.selectedSource = null;
      }
    }
  }

  deleteAllocation(id: number) {
    if (confirm('Are you sure you want to delete this allocation rule?')) {
      this.mockAllocations = this.mockAllocations.filter(a => a.id !== id);
      this.loadAllocationsForSource(this.selectedSource?.id || 0);
    }
  }

  assignUserToSource(userId: string, sourceId: number) {
    const userIdNum = parseInt(userId);
    const allocation = this.allocations.find(a => a.leadSourceID === sourceId);
    if (allocation) {
      allocation.lastUserId = userIdNum;
      allocation.allocationUser = this.availableUsers.find(u => u.id === userIdNum)?.name || '';
      alert(`User assigned successfully to source ${sourceId}`);
    } else {
      alert('Please create an allocation rule first');
    }
  }

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}
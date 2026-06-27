import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Documents } from '../documents/documents';
import { Events } from '../events/events';
import { Tasks } from '../tasks/tasks';

type ViewType = 'grid' | 'list';
type TabType = 'details' | 'tasks' | 'events' | 'documents';
type PopupType = 'task' | 'event' | 'document' | null;

@Component({
  selector: 'app-lead',
  standalone: true,
  imports: [CommonModule, FormsModule, Documents, Events, Tasks],
  templateUrl: './lead.html',
  styleUrls: ['./lead.css']
})
export class Lead {
  currentView: ViewType = 'grid';
  activeTab: TabType = 'details';
  isEditMode = false;
  showPopup: PopupType = null;

  leads: any[] = [];
  filteredLeads: any[] = [];
  selectedLead: any = null;
  leadModel: any = { hashmap: {} };

  leadStages = ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'CONVERTED', 'LOST'];
  viewOptions: ViewType[] = ['grid', 'list'];
  tabOptions: TabType[] = ['details', 'tasks', 'events', 'documents'];

  owners = [
    { id: 'OWN001', name: 'John Doe' },
    { id: 'OWN002', name: 'Jane Smith' },
    { id: 'OWN003', name: 'Bob Wilson' }
  ];

  sources = ['Website', 'Referral', 'LinkedIn', 'Email', 'Call', 'Event'];

  dynamicFields = [
    { id: 'industry', name: 'Industry' },
    { id: 'budget', name: 'Budget' },
    { id: 'timeline', name: 'Timeline' }
  ];

  filters = {
    search: '',
    stage: '',
    source: '',
    owner: ''
  };

  page = 1;
  pageSize = 5;

  get paginatedLeads() {
    const start = (this.page - 1) * this.pageSize;
    return this.filteredLeads.slice(start, start + this.pageSize);
  }

  get totalPages() {
    return Math.ceil(this.filteredLeads.length / this.pageSize) || 1;
  }

  goToPage(p: number) {
    this.page = Math.max(1, Math.min(p, this.totalPages));
  }

  stats = [
    { label: 'Total Leads', value: 0, icon: 'bi-people', color: 'primary' },
    { label: 'New', value: 0, icon: 'bi-star', color: 'warning' },
    { label: 'Qualified', value: 0, icon: 'bi-check-circle', color: 'info' },
    { label: 'Converted', value: 0, icon: 'bi-trophy', color: 'success' }
  ];

  constructor() {
    this.loadSampleData();
  }

  loadSampleData() {
    const now = new Date().toISOString();
    this.leads = [
      {
        id: 'LD001',
        fullName: 'Rahul Sharma',
        email: 'rahul.sharma@email.com',
        phone: '9876543210',
        companyName: 'TechCorp',
        ownerId: 'OWN001',
        stage: 'NEW',
        source: 'Website',
        address: 'Mumbai',
        hashmap: { industry: 'IT', budget: '$50k', timeline: '3 months' },
        task: [],
        events: [],
        documents: [],
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'LD002',
        fullName: 'Priya Patel',
        email: 'priya.patel@email.com',
        phone: '8765432109',
        companyName: 'Innovate Inc',
        ownerId: 'OWN002',
        stage: 'CONTACTED',
        source: 'Referral',
        address: 'Delhi',
        hashmap: { industry: 'Finance', budget: '$100k', timeline: '6 months' },
        task: [],
        events: [],
        documents: [],
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'LD003',
        fullName: 'Amit Kumar',
        email: 'amit.kumar@email.com',
        phone: '7654321098',
        companyName: 'Global Solutions',
        ownerId: 'OWN003',
        stage: 'QUALIFIED',
        source: 'LinkedIn',
        address: 'Bangalore',
        hashmap: { industry: 'Healthcare', budget: '$75k', timeline: '2 months' },
        task: [],
        events: [],
        documents: [],
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'LD003',
        fullName: 'Amit Kumar',
        email: 'amit.kumar@email.com',
        phone: '7654321098',
        companyName: 'Global Solutions',
        ownerId: 'OWN003',
        stage: 'QUALIFIED',
        source: 'LinkedIn',
        address: 'Bangalore',
        hashmap: { industry: 'Healthcare', budget: '$75k', timeline: '2 months' },
        task: [],
        events: [],
        documents: [],
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'LD003',
        fullName: 'Amit Kumar',
        email: 'amit.kumar@email.com',
        phone: '7654321098',
        companyName: 'Global Solutions',
        ownerId: 'OWN003',
        stage: 'QUALIFIED',
        source: 'LinkedIn',
        address: 'Bangalore',
        hashmap: { industry: 'Healthcare', budget: '$75k', timeline: '2 months' },
        task: [],
        events: [],
        documents: [],
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'LD003',
        fullName: 'Amit Kumar',
        email: 'amit.kumar@email.com',
        phone: '7654321098',
        companyName: 'Global Solutions',
        ownerId: 'OWN003',
        stage: 'QUALIFIED',
        source: 'LinkedIn',
        address: 'Bangalore',
        hashmap: { industry: 'Healthcare', budget: '$75k', timeline: '2 months' },
        task: [],
        events: [],
        documents: [],
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'LD003',
        fullName: 'Amit Kumar',
        email: 'amit.kumar@email.com',
        phone: '7654321098',
        companyName: 'Global Solutions',
        ownerId: 'OWN003',
        stage: 'QUALIFIED',
        source: 'LinkedIn',
        address: 'Bangalore',
        hashmap: { industry: 'Healthcare', budget: '$75k', timeline: '2 months' },
        task: [],
        events: [],
        documents: [],
        createdAt: now,
        updatedAt: now
      }, {
        id: 'LD003',
        fullName: 'Amit Kumar',
        email: 'amit.kumar@email.com',
        phone: '7654321098',
        companyName: 'Global Solutions',
        ownerId: 'OWN003',
        stage: 'QUALIFIED',
        source: 'LinkedIn',
        address: 'Bangalore',
        hashmap: { industry: 'Healthcare', budget: '$75k', timeline: '2 months' },
        task: [],
        events: [],
        documents: [],
        createdAt: now,
        updatedAt: now
      }
      , {
        id: 'LD003',
        fullName: 'Amit Kumar',
        email: 'amit.kumar@email.com',
        phone: '7654321098',
        companyName: 'Global Solutions',
        ownerId: 'OWN003',
        stage: 'QUALIFIED',
        source: 'LinkedIn',
        address: 'Bangalore',
        hashmap: { industry: 'Healthcare', budget: '$75k', timeline: '2 months' },
        task: [],
        events: [],
        documents: [],
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'LD003',
        fullName: 'Amit Kumar',
        email: 'amit.kumar@email.com',
        phone: '7654321098',
        companyName: 'Global Solutions',
        ownerId: 'OWN003',
        stage: 'QUALIFIED',
        source: 'LinkedIn',
        address: 'Bangalore',
        hashmap: { industry: 'Healthcare', budget: '$75k', timeline: '2 months' },
        task: [],
        events: [],
        documents: [],
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'LD003',
        fullName: 'Amit Kumar',
        email: 'amit.kumar@email.com',
        phone: '7654321098',
        companyName: 'Global Solutions',
        ownerId: 'OWN003',
        stage: 'QUALIFIED',
        source: 'LinkedIn',
        address: 'Bangalore',
        hashmap: { industry: 'Healthcare', budget: '$75k', timeline: '2 months' },
        task: [],
        events: [],
        documents: [],
        createdAt: now,
        updatedAt: now
      }
    ];
    this.applyFilters();
    this.updateStats();
  }

  setView(view: ViewType) {
    this.currentView = view;
  }

  setTab(tab: TabType) {
    this.activeTab = tab;
  }

  createLead() {
    this.isEditMode = true;
    this.selectedLead = null;
    this.leadModel = { hashmap: {}, stage: 'NEW', source: 'Website' };
  }

  // Add these methods to your Lead class

filterByStage(stage: string) {
  this.filters.stage = this.filters.stage === stage ? '' : stage;
  this.applyFilters();
}

clearStageFilter() {
  this.filters.stage = '';
  this.applyFilters();
}

getStageButtonStyle(stage: string) {
  const colors: any = {
      'NEW': '#0d6efd',
      'CONTACTED': '#ffc107',
      'QUALIFIED': '#0dcaf0',
      'PROPOSAL': '#6c757d',
      'CONVERTED': '#198754',
      'LOST': '#dc3545'
  };
  if (this.filters.stage === stage) {
      return `background-color: ${colors[stage]}; color: ${stage === 'CONTACTED' || stage === 'QUALIFIED' ? '#000' : '#fff'}; border: none;`;
  }
  return '';
}

getTabIcon(tab: string): string {
  const icons: any = {
      'details': 'bi bi-info-circle',
      'tasks': 'bi bi-check-circle',
      'events': 'bi bi-calendar',
      'documents': 'bi bi-file-text'
  };
  return icons[tab] || 'bi bi-circle';
}

  editLead(lead: any) {
    this.selectedLead = lead;
    this.isEditMode = true;
    this.leadModel = { ...lead, hashmap: { ...lead.hashmap } };
  }

  viewLead(lead: any) {
    this.selectedLead = lead;
    this.activeTab = 'details';
  }

  saveLead() {
    const now = new Date().toISOString();
    if (this.selectedLead) {
      const index = this.leads.findIndex(l => l.id === this.selectedLead.id);
      if (index !== -1) {
        this.leads[index] = {
          ...this.leadModel,
          id: this.selectedLead.id,
          task: this.selectedLead.task || [],
          events: this.selectedLead.events || [],
          documents: this.selectedLead.documents || [],
          createdAt: this.selectedLead.createdAt,
          updatedAt: now
        };
      }
    } else {
      this.leads.push({
        ...this.leadModel,
        id: 'LD' + Math.floor(Math.random() * 9000 + 1000),
        task: [],
        events: [],
        documents: [],
        createdAt: now,
        updatedAt: now
      });
    }
    this.cancelEdit();
    this.applyFilters();
    this.updateStats();
  }

  deleteLead(id: string) {
    if (confirm('Delete this lead?')) {
      this.leads = this.leads.filter(l => l.id !== id);
      this.applyFilters();
      this.updateStats();
      if (this.selectedLead?.id === id) this.selectedLead = null;
    }
  }

  cancelEdit() {
    this.isEditMode = false;
    this.leadModel = { hashmap: {} };
  }

  applyFilters() {
    this.filteredLeads = this.leads.filter(lead =>
      (!this.filters.search ||
        lead.fullName?.toLowerCase().includes(this.filters.search.toLowerCase()) ||
        lead.email?.toLowerCase().includes(this.filters.search.toLowerCase()) ||
        lead.companyName?.toLowerCase().includes(this.filters.search.toLowerCase())) &&
      (!this.filters.stage || lead.stage === this.filters.stage) &&
      (!this.filters.source || lead.source === this.filters.source) &&
      (!this.filters.owner || lead.ownerId === this.filters.owner)
    );
    this.page = 1;
  }

  clearFilters() {
    this.filters = { search: '', stage: '', source: '', owner: '' };
    this.filteredLeads = [...this.leads];
    this.page = 1;
  }

  updateStats() {
    this.stats[0].value = this.leads.length;
    this.stats[1].value = this.leads.filter(l => l.stage === 'NEW').length;
    this.stats[2].value = this.leads.filter(l => l.stage === 'QUALIFIED').length;
    this.stats[3].value = this.leads.filter(l => l.stage === 'CONVERTED').length;
  }

  openPopup(type: PopupType) {
    this.showPopup = type;
  }

  closePopup() {
    this.showPopup = null;
  }

  onTaskSave(task: any) {
    if (this.selectedLead) {
      if (!this.selectedLead.task) this.selectedLead.task = [];
      this.selectedLead.task.push({ ...task, id: 'TSK' + Date.now() });
    }
    this.closePopup();
  }

  onEventSave(event: any) {
    if (this.selectedLead) {
      if (!this.selectedLead.events) this.selectedLead.events = [];
      this.selectedLead.events.unshift({ ...event, id: 'EVT' + Date.now() });
    }
    this.closePopup();
  }

  onDocumentSave(doc: any) {
    if (this.selectedLead) {
      if (!this.selectedLead.documents) this.selectedLead.documents = [];
      this.selectedLead.documents.push({ ...doc, id: 'DOC' + Date.now() });
    }
    this.closePopup();
  }

  getOwnerName(id: string) {
    return this.owners.find(o => o.id === id)?.name || id;
  }

  getInitials(name: string) {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
  }

  getStageBadge(stage: string) {
    const classes: any = {
      'NEW': 'bg-primary',
      'CONTACTED': 'bg-warning text-dark',
      'QUALIFIED': 'bg-info text-dark',
      'PROPOSAL': 'bg-secondary',
      'CONVERTED': 'bg-success',
      'LOST': 'bg-danger'
    };
    return classes[stage] || 'bg-secondary';
  }

getStageColor(stage: string): string {
  const colors: any = {
      'NEW': '#0d6efd',
      'CONTACTED': '#ffc107',
      'QUALIFIED': '#0dcaf0',
      'PROPOSAL': '#6c757d',
      'CONVERTED': '#198754',
      'LOST': '#dc3545'
  };
  return colors[stage] || '#6c757d';
}

getStageTextColor(stage: string): string {
  return (stage === 'CONTACTED' || stage === 'QUALIFIED') ? '#000' : '#fff';
}

getLeadsListColumnClass(): string {
  if (this.selectedLead) {
      return 'col-lg-5 d-none d-lg-block'; // Hide on mobile, show on desktop
  }
  return 'col-12';
}

getDetailsColumnClass(): string {
  if (this.selectedLead) {
      return 'col-12'; // Full width on mobile, 7 columns on desktop
  }
  return 'd-none';
}

updateLeadStage(lead: any, newStage: string) {
  lead.stage = newStage;
  lead.updatedAt = new Date().toISOString();
  this.updateStats();
  // If this is the selected lead, update the view
  if (this.selectedLead && this.selectedLead.id === lead.id) {
      this.selectedLead = { ...lead };
  }
}

  objectKeys = Object.keys;
  Math = Math;
}


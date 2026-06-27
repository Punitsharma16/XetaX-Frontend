import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { combineLatest } from 'rxjs';
import { BaseService } from '../../../../../../acore/base/base.service';
import { Loader } from '../../../../../../acore/components/loader/loader';
import { ResourceService } from '../../services/resource.service';
import { DiningResource, BackendResourceType } from '../../models/resource.models';

@Component({
  selector: 'app-table-management',
  standalone: true,
  imports: [CommonModule, FormsModule, Loader],
  templateUrl: './table-management.html',
  styleUrls: ['./table-management.css'],
})
export class TableManagement implements OnInit {
  activeTab: 'tables' | 'rooms' = 'tables';
  isLoading = false;

  showForm = false;
  editMode = false;

  tables: DiningResource[] = [];
  filteredTables: DiningResource[] = [];

  rooms: DiningResource[] = [];
  filteredRooms: DiningResource[] = [];

  searchTerm = '';
  statusFilter = '';

  form: any = {};

  constructor(
    private resourceService: ResourceService,
    private service: BaseService,
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading = true;
    this.service.showLoader();
    combineLatest([
      this.resourceService.getResources('TABLE'),
      this.resourceService.getResources('ROOM'),
    ]).subscribe(([tables, rooms]) => {
      this.tables = tables;
      this.rooms = rooms;
      this.isLoading = false;
      this.service.hideLoader();
      this.clearFilters();
    });
  }

  setTab(tab: 'tables' | 'rooms'): void {
    this.activeTab = tab;
    this.clearFilters();
  }

  filterItems(): void {
    const q = this.searchTerm.toLowerCase();
    if (this.activeTab === 'tables') {
      this.filteredTables = this.tables.filter(t => {
        const matchesSearch = !q || t.number.toLowerCase().includes(q) || t.displayId.toLowerCase().includes(q);
        const matchesStatus = !this.statusFilter ||
          (this.statusFilter === 'available' && !t.isOccupied) ||
          (this.statusFilter === 'occupied' && t.isOccupied);
        return matchesSearch && matchesStatus;
      });
    } else {
      this.filteredRooms = this.rooms.filter(r => {
        const matchesSearch = !q || r.number.toLowerCase().includes(q) || r.displayId.toLowerCase().includes(q) || (r.roomType || '').toLowerCase().includes(q);
        const matchesStatus = !this.statusFilter ||
          (this.statusFilter === 'available' && !r.isOccupied) ||
          (this.statusFilter === 'occupied' && r.isOccupied);
        return matchesSearch && matchesStatus;
      });
    }
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.statusFilter = '';
    this.filteredTables = [...this.tables];
    this.filteredRooms = [...this.rooms];
  }

  getTotalCount(): number {
    return this.activeTab === 'tables' ? this.tables.length : this.rooms.length;
  }

  getAvailableCount(): number {
    const items = this.activeTab === 'tables' ? this.tables : this.rooms;
    return items.filter(i => !i.isOccupied).length;
  }

  getOccupiedCount(): number {
    const items = this.activeTab === 'tables' ? this.tables : this.rooms;
    return items.filter(i => i.isOccupied).length;
  }

  getExtraStatLabel(): string {
    return this.activeTab === 'tables' ? 'Total Capacity' : 'Total Floors';
  }

  getExtraStatValue(): number {
    if (this.activeTab === 'tables') {
      return this.tables.reduce((sum, t) => sum + t.capacity, 0);
    }
    return new Set(this.rooms.map(r => r.floor)).size;
  }

  openNew(): void {
    this.editMode = false;
    if (this.activeTab === 'tables') {
      this.form = { number: '', capacity: 4, isOccupied: false };
    } else {
      this.form = { number: '', roomType: 'Standard', floor: 1, isOccupied: false };
    }
    this.showForm = true;
  }

  openEdit(item: DiningResource): void {
    this.editMode = true;
    this.form = {
      number: item.number,
      capacity: item.capacity,
      roomType: item.roomType,
      floor: item.floor,
      isOccupied: item.isOccupied,
    };
    this.selectedItem = item;
    this.showForm = true;
  }

  selectedItem: DiningResource | null = null;

  save(): void {
    if (!this.form.number) return;

    const resourceType: BackendResourceType = this.activeTab === 'tables' ? 'TABLE' : 'ROOM';

    if (this.editMode && this.selectedItem) {
      this.resourceService.create({
        ...this.form,
        resourceType,
      } as any).subscribe(() => {
        this.loadData();
        this.showForm = false;
      });
    } else {
      this.resourceService.create({
        ...this.form,
        resourceType,
      } as any).subscribe(() => {
        this.loadData();
        this.showForm = false;
      });
    }
  }

  deleteItem(item: DiningResource): void {
    if (confirm('Are you sure you want to delete this?')) {
      if (this.activeTab === 'tables') {
        this.tables = this.tables.filter(t => t.id !== item.id);
      } else {
        this.rooms = this.rooms.filter(r => r.id !== item.id);
      }
      this.filterItems();
    }
  }

  getQrUrl(item: DiningResource): string {
    return `${window.location.origin}/pages/dining/${this.activeTab === 'tables' ? 'table' : 'room'}/${item.displayId}`;
  }

  copyQrUrl(item: DiningResource): void {
    navigator.clipboard.writeText(this.getQrUrl(item));
  }

  cancel(): void {
    this.showForm = false;
    this.selectedItem = null;
  }

  trackById(index: number, item: DiningResource): number {
    return item.id;
  }
}

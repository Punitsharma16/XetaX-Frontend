// dynamic-field.component.ts
import { CommonModule } from '@angular/common';
import { Component, HostListener } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface FieldOption {
  value: string;
  label: string;
}

interface DynamicField {
  id: string;
  required: boolean;
  visible: boolean;
  showTables: boolean;
  showFilter: boolean;
  showReport: boolean;
  showInExcel: boolean;
  fieldName: string;
  fieldDataType: 'Text' | 'Number' | 'Email' | 'Date' | 'Dropdown' | 'Checkbox' | 'Radio' | 'Textarea' | 'Phone' | 'Url';
  placeHolder: string;
  minLength: number;
  maxLength: number;
  pattern: string;
  createDate: string | null;
  createBy: string | null;
  updateDate: string;
  updateBy: string;
  dateFormat: string | null;
  accountId: number;
  sequence: number;
  fieldId: string;
  option: FieldOption[];
}

@Component({
  selector: 'app-dnyamic-field',
  imports: [CommonModule, FormsModule],
  templateUrl: './dnyamic-field.html',
  styleUrl: './dnyamic-field.css',
})
export class DnyamicField {
  windowWidth = window.innerWidth;
  dataTypes = ['Text', 'Number', 'Email', 'Date', 'Dropdown', 'Checkbox', 'Radio', 'Textarea', 'Phone', 'Url'];
  fields: DynamicField[] = [];
  filteredFields: DynamicField[] = [];
  selectedField: DynamicField | null = null;
  searchTerm: string = '';
  isEditMode: boolean = false;
  showPreview: boolean = false;
  currentView: 'grid' | 'list' = 'grid';
  showDetailsModal: boolean = false;

  fieldModel: DynamicField = {
    id: '',
    required: false,
    visible: true,
    showTables: true,
    showFilter: false,
    showReport: true,
    showInExcel: true,
    fieldName: '',
    fieldDataType: 'Text',
    placeHolder: '',
    minLength: 0,
    maxLength: 255,
    pattern: '',
    createDate: null,
    createBy: null,
    updateDate: new Date().toLocaleDateString('en-GB').split('/').join('-') + ' ' + new Date().toLocaleTimeString(),
    updateBy: 'mis@prpservices.in',
    dateFormat: null,
    accountId: 0,
    sequence: 0,
    fieldId: '',
    option: []
  };

  newOption: FieldOption = { value: '', label: '' };

  ngOnInit() {
    this.loadSampleFields();
  }

  loadSampleFields() {
    this.fields = [
      {
        id: 'vendor',
        required: false,
        visible: false,
        showTables: true,
        showFilter: false,
        showReport: true,
        showInExcel: true,
        fieldName: 'Campaign Name',
        fieldDataType: 'Text',
        placeHolder: '',
        minLength: 0,
        maxLength: 0,
        pattern: '',
        createDate: null,
        createBy: null,
        updateDate: '07-08-2024 11:37:13',
        updateBy: 'mis@prpservices.in',
        dateFormat: null,
        accountId: 0,
        sequence: 0,
        fieldId: 'vendor',
        option: []
      },
      {
        id: 'status',
        required: true,
        visible: true,
        showTables: true,
        showFilter: true,
        showReport: true,
        showInExcel: true,
        fieldName: 'Status',
        fieldDataType: 'Dropdown',
        placeHolder: 'Select status',
        minLength: 0,
        maxLength: 0,
        pattern: '',
        createDate: null,
        createBy: null,
        updateDate: '07-08-2024 11:38:45',
        updateBy: 'mis@prpservices.in',
        dateFormat: null,
        accountId: 0,
        sequence: 1,
        fieldId: 'status',
        option: [
          { value: 'active', label: 'Active' },
          { value: 'inactive', label: 'Inactive' },
          { value: 'pending', label: 'Pending' }
        ]
      }
    ];

    this.filteredFields = [...this.fields];
  }

  filterFields() {
    if (!this.searchTerm) {
      this.filteredFields = [...this.fields];
    } else {
      const term = this.searchTerm.toLowerCase();
      this.filteredFields = this.fields.filter(field =>
        field.fieldName.toLowerCase().includes(term) ||
        field.fieldDataType.toLowerCase().includes(term) ||
        field.fieldId.toLowerCase().includes(term)
      );
    }
  }

  getRequiredFieldsCount(): number {
    return this.fields.filter(f => f.required).length;
  }

  setView(view: 'grid' | 'list') {
    this.currentView = view;
    // Clear selection when switching to list view
    if (view === 'list') {
      this.selectedField = null;
    }
  }

  viewFieldDetails(field: DynamicField) {
    this.selectedField = field;
    this.showDetailsModal = true;
  }

  closeDetailsModal() {
    this.showDetailsModal = false;
    this.selectedField = null;
  }

  addField() {
    this.isEditMode = true;
    this.selectedField = null;
    this.resetForm();
  }

  editField(field: DynamicField) {
    this.isEditMode = true;
    this.selectedField = field;
    this.fieldModel = JSON.parse(JSON.stringify(field)); // Deep copy
    this.showDetailsModal = false;
  }

  deleteField(id: string) {
    if (confirm('Are you sure you want to delete this field?')) {
      const index = this.fields.findIndex(f => f.id === id);
      if (index !== -1) {
        this.fields.splice(index, 1);
        this.filteredFields = [...this.fields];
        if (this.selectedField && this.selectedField.id === id) {
          this.selectedField = this.fields.length > 0 ? this.fields[0] : null;
        }
        this.showDetailsModal = false;
      }
    }
  }

  resetForm() {
    const now = new Date();
    const formattedDate = this.formatDate(now);

    this.fieldModel = {
      id: 'field_' + Math.floor(Math.random() * 10000),
      required: false,
      visible: true,
      showTables: true,
      showFilter: false,
      showReport: true,
      showInExcel: true,
      fieldName: '',
      fieldDataType: 'Text',
      placeHolder: '',
      minLength: 0,
      maxLength: 255,
      pattern: '',
      createDate: null,
      createBy: null,
      updateDate: formattedDate,
      updateBy: 'mis@prpservices.in',
      dateFormat: null,
      accountId: 0,
      sequence: this.fields.length,
      fieldId: '',
      option: []
    };
  }

  formatDate(date: Date): string {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    return `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`;
  }

  addOption() {
    if (this.newOption.label && this.newOption.value) {
      this.fieldModel.option.push({ ...this.newOption });
      this.newOption = { value: '', label: '' };
    }
  }

  removeOption(index: number) {
    this.fieldModel.option.splice(index, 1);
  }

  onSubmit() {
    // Generate fieldId from fieldName if not set
    if (!this.fieldModel.fieldId && this.fieldModel.fieldName) {
      this.fieldModel.fieldId = this.fieldModel.fieldName.toLowerCase().replace(/\s+/g, '_');
    }

    // Set update date
    this.fieldModel.updateDate = this.formatDate(new Date());

    if (this.selectedField) {
      // Update existing field
      const index = this.fields.findIndex(f => f.id === this.selectedField!.id);
      if (index !== -1) {
        this.fieldModel.id = this.selectedField.id; // Preserve original ID
        this.fields[index] = { ...this.fieldModel };
      }
    } else {
      // Add new field
      this.fieldModel.id = 'field_' + (this.fields.length + 1);
      this.fieldModel.sequence = this.fields.length;
      this.fields.push({ ...this.fieldModel });
    }

    this.filteredFields = [...this.fields];
    this.isEditMode = false;
    this.selectedField = this.fields[this.fields.length - 1];
  }

  cancelEdit() {
    this.isEditMode = false;
    this.selectedField = this.fields.length > 0 ? this.fields[0] : null;
  }

  selectField(field: DynamicField) {
    this.selectedField = field;
  }

  getDataTypeIcon(type: string): string {
    const icons: { [key: string]: string } = {
      'Text': 'bi-fonts',
      'Number': 'bi-123',
      'Email': 'bi-envelope',
      'Date': 'bi-calendar',
      'Dropdown': 'bi-menu-down',
      'Checkbox': 'bi-check-square',
      'Radio': 'bi-circle',
      'Textarea': 'bi-textarea',
      'Phone': 'bi-telephone',
      'Url': 'bi-link'
    };
    return icons[type] || 'bi-input-cursor';
  }

  getTypeColor(type: string): string {
    const colors: { [key: string]: string } = {
      'Text': '#0d6efd',
      'Number': '#198754',
      'Email': '#dc3545',
      'Date': '#ffc107',
      'Dropdown': '#6f42c1',
      'Checkbox': '#20c997',
      'Radio': '#fd7e14',
      'Textarea': '#0dcaf0',
      'Phone': '#6610f2',
      'Url': '#d63384'
    };
    return colors[type] || '#6c757d';
  }

  @HostListener('window:resize') onResize() { this.windowWidth = window.innerWidth; }

  togglePreview() {
    this.showPreview = !this.showPreview;
  }
}
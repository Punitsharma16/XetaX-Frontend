import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';


export interface Document {
  id: string;
  name: string;
  type: string;
  size: string;
  url: string;
  uploadDate: string;
  uploadedBy: string;
  leadId: string;
}


@Component({
  selector: 'app-documents',
  imports: [CommonModule , FormsModule],
  templateUrl: './documents.html',
  styleUrl: './documents.css',
})
export class Documents {
  @Input() leadId: string = '';
  @Input() documents: Document[] = [];
  @Output() documentUpdated = new EventEmitter<Document>();

  showDocumentForm = false;
  selectedFile: File | null = null;
  documentModel: Partial<Document> = {};
  uploadProgress: number = 0;
  isUploading: boolean = false;

  documentTypes = ['PDF', 'DOC', 'XLS', 'IMAGE', 'OTHER'];

  ngOnInit() {
      // Initialize with sample data if empty
      if (!this.documents || this.documents.length === 0) {
          this.loadSampleDocuments();
      }
  }

  loadSampleDocuments() {
      this.documents = [
          {
              id: 'doc-001',
              name: 'Proposal_ABC_Corp.pdf',
              type: 'PDF',
              size: '2.4 MB',
              url: 'https://example.com/docs/proposal.pdf',
              uploadDate: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
              uploadedBy: 'user-uuid-123',
              leadId: this.leadId || 'lead-123'
          },
          {
              id: 'doc-002',
              name: 'Requirements_Spec.docx',
              type: 'DOC',
              size: '1.1 MB',
              url: 'https://example.com/docs/requirements.docx',
              uploadDate: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
              uploadedBy: 'user-uuid-456',
              leadId: this.leadId || 'lead-123'
          },
          {
              id: 'doc-003',
              name: 'Pricing_Sheet.xlsx',
              type: 'XLS',
              size: '856 KB',
              url: 'https://example.com/docs/pricing.xlsx',
              uploadDate: new Date().toISOString(),
              uploadedBy: 'user-uuid-123',
              leadId: this.leadId || 'lead-123'
          }
      ];
  }

  addDocument() {
      this.documentModel = {
          name: '',
          type: 'PDF',
          leadId: this.leadId,
          uploadedBy: 'current-user'
      };
      this.selectedFile = null;
      this.showDocumentForm = true;
  }

  onFileSelected(event: any) {
      this.selectedFile = event.target.files[0];
      if (this.selectedFile) {
          // Auto-fill document name from file name
          this.documentModel.name = this.selectedFile.name;
          
          // Auto-detect type from extension
          const extension = this.selectedFile.name.split('.').pop()?.toLowerCase();
          if (extension) {
              if (['pdf'].includes(extension)) this.documentModel.type = 'PDF';
              else if (['doc', 'docx'].includes(extension)) this.documentModel.type = 'DOC';
              else if (['xls', 'xlsx'].includes(extension)) this.documentModel.type = 'XLS';
              else if (['jpg', 'jpeg', 'png', 'gif'].includes(extension)) this.documentModel.type = 'IMAGE';
              else this.documentModel.type = 'OTHER';
          }
      }
  }

  saveDocument() {
      if (!this.documentModel.name) return;

      this.isUploading = true;
      this.uploadProgress = 0;

      // Simulate upload progress
      const interval = setInterval(() => {
          this.uploadProgress += 10;
          if (this.uploadProgress >= 100) {
              clearInterval(interval);
              
              // Create new document after "upload" completes
              const newDocument: Document = {
                  id: this.generateDocumentId(),
                  name: this.documentModel.name || 'Untitled',
                  type: this.documentModel.type || 'OTHER',
                  size: this.selectedFile ? this.formatFileSize(this.selectedFile.size) : '0 KB',
                  url: this.selectedFile ? URL.createObjectURL(this.selectedFile) : '#',
                  uploadDate: new Date().toISOString(),
                  uploadedBy: 'current-user',
                  leadId: this.leadId
              };

              this.documents.push(newDocument);
              this.documentUpdated.emit(newDocument);
              
              this.isUploading = false;
              this.closeDocumentForm();
          }
      }, 200);
  }

  deleteDocument(docId: string) {
      if (confirm('Are you sure you want to delete this document?')) {
          this.documents = this.documents.filter(d => d.id !== docId);
          this.documentUpdated.emit({ id: docId } as Document);
      }
  }

  downloadDocument(doc: Document) {
      // Create a temporary link to download the file
      const link = document.createElement('a');
      link.href = doc.url;
      link.download = doc.name;
      link.target = '_blank';
      link.click();
  }

  closeDocumentForm() {
      this.showDocumentForm = false;
      this.documentModel = {};
      this.selectedFile = null;
      this.uploadProgress = 0;
      this.isUploading = false;
  }

  getFileIcon(type: string): string {
      const icons: { [key: string]: string } = {
          'PDF': 'bi-file-pdf',
          'DOC': 'bi-file-word',
          'XLS': 'bi-file-excel',
          'IMAGE': 'bi-file-image',
          'OTHER': 'bi-file-text'
      };
      return icons[type] || 'bi-file';
  }

  getFileColor(type: string): string {
      const colors: { [key: string]: string } = {
          'PDF': 'danger',
          'DOC': 'primary',
          'XLS': 'success',
          'IMAGE': 'info',
          'OTHER': 'secondary'
      };
      return colors[type] || 'secondary';
  }

  formatFileSize(bytes: number): string {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  formatDate(dateString: string): string {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays} days ago`;
      
      return date.toLocaleDateString();
  }

  private generateDocumentId(): string {
      return 'doc-' + Math.random().toString(36).substr(2, 9);
  }
}

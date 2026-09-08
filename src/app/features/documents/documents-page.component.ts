import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ConfirmService } from '../../core/services/confirm.service';
import { ToastService } from '../../core/services/toast.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import {
  EmptyStateComponent,
  ErrorStateComponent,
  TableSkeletonComponent,
} from '../../shared/components/state/state-views.component';
import { DocumentFile, DocumentService } from './document.service';

/**
 * Document library: upload PDFs, images and DOCX templates once, then attach
 * them to any WhatsApp or email send. DOCX files can carry {{field_key}}
 * variables that are filled from a record's data at send time.
 */
@Component({
  selector: 'app-documents-page',
  standalone: true,
  imports: [
    DatePipe,
    DecimalPipe,
    FormsModule,
    PageHeaderComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    TableSkeletonComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './documents-page.component.html',
  styleUrl: './documents-page.component.css',
})
export class DocumentsPageComponent {
  private readonly documentService = inject(DocumentService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);

  readonly documents = signal<DocumentFile[]>([]);
  readonly loading = signal(true);
  readonly failed = signal(false);
  readonly uploading = signal(false);

  uploadName = '';
  pendingFile: File | null = null;

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.failed.set(false);
    this.documentService.list().subscribe({
      next: (docs) => {
        this.documents.set(docs ?? []);
        this.loading.set(false);
      },
      error: () => {
        this.failed.set(true);
        this.loading.set(false);
      },
    });
  }

  onFilePicked(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.pendingFile = input.files?.[0] ?? null;
    if (this.pendingFile && !this.uploadName.trim()) {
      this.uploadName = this.pendingFile.name.replace(/\.[^.]+$/, '');
    }
  }

  upload(): void {
    if (!this.pendingFile) {
      this.toast.warning('Choose a file first');
      return;
    }
    if (this.pendingFile.size > 5 * 1024 * 1024) {
      this.toast.warning('File is too large', '5 MB maximum.');
      return;
    }
    this.uploading.set(true);
    this.documentService.upload(this.pendingFile, this.uploadName).subscribe({
      next: () => {
        this.uploading.set(false);
        this.pendingFile = null;
        this.uploadName = '';
        this.toast.success('Document uploaded');
        this.load();
      },
      error: (err) => {
        this.uploading.set(false);
        this.toast.warning('Upload failed', err?.error?.message || 'Please try again.');
      },
    });
  }

  download(document: DocumentFile): void {
    window.open(this.documentService.downloadUrl(document.id), '_blank');
  }

  remove(document: DocumentFile): void {
    this.confirm.confirmDelete(`document "${document.name}"`).subscribe((ok) => {
      if (!ok) return;
      this.documentService.delete(document.id).subscribe({
        next: () => {
          this.toast.success('Document deleted');
          this.load();
        },
      });
    });
  }

  icon(document: DocumentFile): string {
    const type = document.contentType || '';
    if (type.includes('pdf')) return 'bi-file-earmark-pdf text-danger';
    if (type.startsWith('image/')) return 'bi-file-earmark-image text-primary';
    if (document.supportsVariables) return 'bi-file-earmark-word text-info';
    return 'bi-file-earmark';
  }
}

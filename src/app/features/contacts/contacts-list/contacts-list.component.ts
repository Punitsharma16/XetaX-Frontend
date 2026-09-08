import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { ToastService } from '../../../core/services/toast.service';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import {
  EmptyStateComponent,
  ErrorStateComponent,
  TableSkeletonComponent,
} from '../../../shared/components/state/state-views.component';
import { WhatsAppService, WhatsAppTemplate } from '../../whatsapp/whatsapp.service';
import { BulkResult, Contact, ContactImportResult, ContactsService } from '../contacts.service';

type ComposeChannel = 'whatsapp' | 'email';

/**
 * Address book list. A row opens the full contact page (details + WhatsApp
 * chat + email history live there — no popups); the list keeps only search,
 * selection and the BULK send modals (WhatsApp with optional template).
 */
@Component({
  selector: 'app-contacts-list',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    ModalComponent,
    PageHeaderComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    TableSkeletonComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './contacts-list.component.html',
  styleUrl: './contacts-list.component.css',
})
export class ContactsListComponent {
  private readonly contactsService = inject(ContactsService);
  private readonly whatsappService = inject(WhatsAppService);
  private readonly toast = inject(ToastService);

  readonly loading = signal(true);
  readonly failed = signal(false);
  readonly contacts = signal<Contact[]>([]);
  readonly total = signal(0);

  search = '';
  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  // ------------------------------------------------------------- selection
  readonly selected = signal<Set<number>>(new Set());
  readonly allSelected = computed(
    () => this.contacts().length > 0 && this.selected().size === this.contacts().length,
  );

  // ---------------------------------------------------------- bulk compose
  // ---- CSV import / export ----
  readonly importOpen = signal(false);
  readonly importing = signal(false);
  readonly importFile = signal<File | null>(null);
  readonly importResult = signal<ContactImportResult | null>(null);
  readonly exporting = signal(false);

  readonly composeOpen = signal(false);
  readonly composeChannel = signal<ComposeChannel>('whatsapp');
  readonly sending = signal(false);
  readonly templates = signal<WhatsAppTemplate[]>([]);
  readonly approvedTemplates = computed(() =>
    this.templates().filter((t) => (t.status || '').toUpperCase() === 'APPROVED'),
  );
  composeSubject = '';
  composeBody = '';
  composeTemplate = '';

  constructor() {
    this.load();
    this.whatsappService.getTemplates().subscribe({
      next: (list) => this.templates.set(list ?? []),
      error: () => this.templates.set([]),
    });
  }

  load(): void {
    this.loading.set(true);
    this.failed.set(false);
    this.contactsService.list(this.search).subscribe({
      next: (page) => {
        this.contacts.set(page.content ?? []);
        this.total.set(page.totalElements ?? 0);
        this.selected.set(new Set());
        this.loading.set(false);
      },
      error: () => {
        this.failed.set(true);
        this.loading.set(false);
      },
    });
  }

  onSearch(): void {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.load(), 300);
  }

  toggle(id: number): void {
    const next = new Set(this.selected());
    if (next.has(id)) next.delete(id);
    else next.add(id);
    this.selected.set(next);
  }

  toggleAll(): void {
    this.selected.set(
      this.allSelected() ? new Set() : new Set(this.contacts().map((c) => c.id)),
    );
  }

  // ---------------------------------------------------------- bulk compose

  openCompose(channel: ComposeChannel): void {
    if (!this.selected().size) return;
    this.composeChannel.set(channel);
    this.composeSubject = '';
    this.composeBody = '';
    this.composeTemplate = '';
    this.composeOpen.set(true);
  }

  sendCompose(): void {
    const channel = this.composeChannel();
    const usingTemplate = channel === 'whatsapp' && !!this.composeTemplate;
    if (!usingTemplate && !this.composeBody.trim()) {
      this.toast.warning(channel === 'email' ? 'Subject and message are both required' : 'Write a message or pick a template');
      return;
    }
    if (channel === 'email' && !this.composeSubject.trim()) {
      this.toast.warning('Subject and message are both required');
      return;
    }
    const ids = [...this.selected()];
    const template = this.approvedTemplates().find((t) => t.name === this.composeTemplate);
    this.sending.set(true);
    const request = channel === 'whatsapp'
      ? this.contactsService.bulkWhatsApp(
          ids,
          this.composeBody,
          usingTemplate ? template?.name : undefined,
          usingTemplate ? template?.language : undefined,
        )
      : this.contactsService.bulkEmail(ids, this.composeSubject, this.composeBody);
    request.subscribe({
      next: (result: BulkResult) => {
        this.sending.set(false);
        this.composeOpen.set(false);
        if (result.failed > 0) {
          this.toast.warning(
            `${result.sent} sent, ${result.failed} failed`,
            result.failedNames.slice(0, 5).join(', '),
          );
        } else {
          this.toast.success(`Sent to ${result.sent} contacts`);
        }
      },
      error: () => this.sending.set(false),
    });
  }

  // ------------------------------------------------------ import / export

  openImport(): void {
    this.importFile.set(null);
    this.importResult.set(null);
    this.importOpen.set(true);
  }

  onImportFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.importFile.set(input.files?.[0] ?? null);
  }

  runImport(): void {
    const file = this.importFile();
    if (!file) return;
    this.importing.set(true);
    this.contactsService.importCsv(file).subscribe({
      next: (result) => {
        this.importing.set(false);
        this.importResult.set(result);
        if (result.imported) this.load();
      },
      error: () => this.importing.set(false),
    });
  }

  exportCsv(): void {
    this.exporting.set(true);
    this.contactsService.exportCsv().subscribe({
      next: (blob) => {
        this.exporting.set(false);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'contacts.csv';
        a.click();
        URL.revokeObjectURL(url);
      },
      error: () => {
        this.exporting.set(false);
        this.toast.error('Export failed');
      },
    });
  }
}

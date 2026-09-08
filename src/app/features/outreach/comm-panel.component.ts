import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ToastService } from '../../core/services/toast.service';
import { EmailLogEntry } from '../contacts/contacts.service';
import { WhatsAppService, WhatsAppTemplate } from '../whatsapp/whatsapp.service';
import { OutreachService, WaChatMessage } from './outreach.service';
import { DocumentFile, DocumentService } from '../documents/document.service';

/**
 * The communication half of a contact/record page: live WhatsApp chat with
 * this phone + email history with this address, and inline composers for
 * both (free text inside the 24h window, or an approved template any time).
 * Everything is on the page — no popups.
 */
@Component({
  selector: 'app-comm-panel',
  standalone: true,
  imports: [DatePipe, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './comm-panel.component.html',
  styleUrl: './comm-panel.component.css',
})
export class CommPanelComponent {
  private readonly outreach = inject(OutreachService);
  private readonly whatsappService = inject(WhatsAppService);
  private readonly toast = inject(ToastService);
  private readonly documentService = inject(DocumentService);

  readonly phone = input<string>('');
  readonly email = input<string>('');
  readonly personName = input<string>('');
  readonly recordId = input<string | undefined>(undefined);

  // ------------------------------------------------------------------ chat
  readonly chat = signal<WaChatMessage[]>([]);
  readonly chatLoading = signal(false);
  readonly waSending = signal(false);
  readonly templates = signal<WhatsAppTemplate[]>([]);
  readonly approvedTemplates = computed(() =>
    this.templates().filter((t) => (t.status || '').toUpperCase() === 'APPROVED'),
  );
  waMessage = '';
  waTemplate = '';
  waButtons: string[] = ['', '', ''];
  waDocumentId = '';

  // shared document library (attachments for both composers)
  readonly documents = signal<DocumentFile[]>([]);
  emailDocumentId = '';
  personalizeDoc = true;

  // ----------------------------------------------------------------- email
  readonly emails = signal<EmailLogEntry[]>([]);
  readonly emailsLoading = signal(false);
  readonly emailComposerOpen = signal(false);
  readonly emailSending = signal(false);
  emailSubject = '';
  emailBody = '';

  constructor() {
    effect(() => {
      const phone = this.phone();
      if (phone) this.loadChat(phone);
      else this.chat.set([]);
    });
    effect(() => {
      const email = this.email();
      if (email) this.loadEmails(email);
      else this.emails.set([]);
    });
    this.whatsappService.getTemplates().subscribe({
      next: (list) => this.templates.set(list ?? []),
      error: () => this.templates.set([]),
    });
    this.documentService.list().subscribe({
      next: (docs) => this.documents.set(docs ?? []),
      error: () => this.documents.set([]),
    });
  }

  selectedWaDoc(): DocumentFile | undefined {
    return this.documents().find((d) => String(d.id) === this.waDocumentId);
  }

  selectedEmailDoc(): DocumentFile | undefined {
    return this.documents().find((d) => String(d.id) === this.emailDocumentId);
  }

  // ------------------------------------------------------------------ load

  private loadChat(phone: string): void {
    this.chatLoading.set(true);
    this.outreach.whatsappHistory(phone).subscribe({
      next: (messages) => {
        this.chat.set(messages);
        this.chatLoading.set(false);
      },
      error: () => this.chatLoading.set(false),
    });
  }

  private loadEmails(email: string): void {
    this.emailsLoading.set(true);
    this.outreach.emails(email).subscribe({
      next: (logs) => {
        this.emails.set(logs);
        this.emailsLoading.set(false);
      },
      error: () => this.emailsLoading.set(false),
    });
  }

  refresh(): void {
    if (this.phone()) this.loadChat(this.phone());
    if (this.email()) this.loadEmails(this.email());
  }

  // -------------------------------------------------------------- whatsapp

  sendWhatsApp(): void {
    const phone = this.phone();
    if (!phone) return;
    const usingTemplate = !!this.waTemplate;
    if (!usingTemplate && !this.waMessage.trim() && !this.selectedWaDoc()) {
      this.toast.warning('Write a message, pick a template or attach a document');
      return;
    }
    const template = this.approvedTemplates().find((t) => t.name === this.waTemplate);
    this.waSending.set(true);

    // A picked document rides its own endpoint (message becomes the caption).
    const waDoc = !usingTemplate ? this.selectedWaDoc() : undefined;
    if (waDoc) {
      this.documentService
        .send(waDoc.id, {
          channel: 'WHATSAPP',
          phone,
          message: this.waMessage.trim() || undefined,
          recordId: this.recordId(),
          personalize: this.recordId() ? this.personalizeDoc : false,
        })
        .subscribe({
          next: () => {
            this.waSending.set(false);
            this.waMessage = '';
            this.waDocumentId = '';
            this.toast.success('Document queued', waDoc.name);
            setTimeout(() => this.loadChat(phone), 1200);
          },
          error: () => this.waSending.set(false),
        });
      return;
    }

    const buttons = this.waButtons.map((b) => b.trim()).filter(Boolean);
    this.outreach
      .sendWhatsApp({
        phone,
        message: usingTemplate ? undefined : this.waMessage.trim(),
        templateName: usingTemplate ? template?.name : undefined,
        templateLanguage: usingTemplate ? template?.language : undefined,
        recordId: this.recordId(),
        buttonsJson: !usingTemplate && buttons.length ? JSON.stringify(buttons) : undefined,
      })
      .subscribe({
        next: () => {
          this.waSending.set(false);
          this.waMessage = '';
          this.waTemplate = '';
          this.waButtons = ['', '', ''];
          this.toast.success('WhatsApp queued', usingTemplate ? `Template: ${template?.name}` : undefined);
          // Dispatch is async — a short delay lets the new message appear in the chat.
          setTimeout(() => this.loadChat(phone), 1200);
        },
        error: () => this.waSending.set(false),
      });
  }

  // ----------------------------------------------------------------- email

  sendEmail(): void {
    const email = this.email();
    if (!email) return;
    if (!this.emailSubject.trim() || !this.emailBody.trim()) {
      this.toast.warning('Subject and message are both required');
      return;
    }
    this.emailSending.set(true);

    const emailDoc = this.selectedEmailDoc();
    if (emailDoc) {
      this.documentService
        .send(emailDoc.id, {
          channel: 'EMAIL',
          to: email,
          subject: this.emailSubject.trim(),
          message: this.emailBody.trim(),
          recordId: this.recordId(),
          personalize: this.recordId() ? this.personalizeDoc : false,
        })
        .subscribe({
          next: () => {
            this.emailSending.set(false);
            this.emailComposerOpen.set(false);
            this.emailSubject = '';
            this.emailBody = '';
            this.emailDocumentId = '';
            this.toast.success('Email with attachment sent', email);
            this.loadEmails(email);
          },
          error: () => {
            this.emailSending.set(false);
            this.loadEmails(email);
          },
        });
      return;
    }

    this.outreach.sendEmail(email, this.emailSubject.trim(), this.emailBody.trim()).subscribe({
      next: () => {
        this.emailSending.set(false);
        this.emailComposerOpen.set(false);
        this.emailSubject = '';
        this.emailBody = '';
        this.toast.success('Email sent', email);
        this.loadEmails(email);
      },
      error: () => {
        this.emailSending.set(false);
        // the FAILED entry still shows in the history
        this.loadEmails(email);
      },
    });
  }
}

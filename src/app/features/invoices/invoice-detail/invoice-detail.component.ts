import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { DatePipe, DecimalPipe, LowerCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { ConfirmService } from '../../../core/services/confirm.service';
import { PermissionService } from '../../../core/services/permission.service';
import { ToastService } from '../../../core/services/toast.service';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { ErrorStateComponent } from '../../../shared/components/state/state-views.component';
import { Contact, ContactsService } from '../../contacts/contacts.service';
import { Invoice, InvoiceInput, InvoicePayment, InvoiceService } from '../invoice.service';

interface ItemRow {
  uid: number;
  description: string;
  hsn: string;
  unit: string;
  quantity: number;
  unitPrice: number;
}

/**
 * One page, two moods: '/new' is the editor (attach to a contact or arrive
 * with ?recordId= from a closed record), '/:id' is the issued invoice —
 * status banner, PDF, send buttons and the payment ledger. Money math mirrors
 * the server (the server's numbers always win after save).
 */
@Component({
  selector: 'app-invoice-detail',
  standalone: true,
  imports: [
    DatePipe,
    DecimalPipe,
    LowerCasePipe,
    FormsModule,
    RouterLink,
    ModalComponent,
    PageHeaderComponent,
    ErrorStateComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './invoice-detail.component.html',
  styleUrl: './invoice-detail.component.css',
})
export class InvoiceDetailComponent {
  private readonly invoiceService = inject(InvoiceService);
  private readonly contactsService = inject(ContactsService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly perms = inject(PermissionService);
  private readonly router = inject(Router);

  /** 'new' => create mode. */
  readonly id = input.required<string>();
  /** Optional prefills for create mode. */
  readonly contactId = input<string | undefined>(undefined);
  readonly recordId = input<string | undefined>(undefined);
  readonly customer = input<string | undefined>(undefined);
  readonly phone = input<string | undefined>(undefined);
  readonly email = input<string | undefined>(undefined);

  readonly isNew = computed(() => this.id() === 'new');
  readonly loading = signal(false);
  readonly failed = signal(false);
  readonly saving = signal(false);
  readonly sending = signal<string | null>(null);

  readonly invoice = signal<Invoice | null>(null);
  readonly payments = signal<InvoicePayment[]>([]);
  readonly contacts = signal<Contact[]>([]);

  // ---- editable state ----
  selectedContactId: number | null = null;
  attachedRecordId: string | null = null;
  customerName = '';
  customerPhone = '';
  customerEmail = '';
  customerAddress = '';
  issueDate = new Date().toISOString().slice(0, 10);
  dueDate = '';
  taxPercent = 0;
  discount = 0;
  notes = '';
  customerGstin = '';
  sellerGstin = '';
  gstMode: '' | 'INTRA' | 'INTER' = '';
  bankDetails = '';
  readonly units = ['Nos', 'Pcs', 'Kg', 'Box', 'Hrs', 'Set', 'Mtr', 'Ltr'];
  readonly items = signal<ItemRow[]>([]);
  private nextUid = 1;

  // ---- payment modal ----
  readonly paymentOpen = signal(false);
  payAmount: number | null = null;
  payMode = 'UPI';
  payReference = '';
  payDate = new Date().toISOString().slice(0, 10);

  readonly modes = ['UPI', 'CASH', 'BANK', 'CARD', 'CHEQUE', 'OTHER'];

  /** The letterhead — owner's company from /api/team/me. */
  readonly company = computed(() => this.perms.company() || 'Your Business');

  // ---- Draft with AI ----
  aiPrompt = '';
  readonly aiDrafting = signal(false);

  draftWithAi(): void {
    const prompt = this.aiPrompt.trim();
    if (!prompt) {
      this.toast.warning('Describe the invoice first — items and amounts');
      return;
    }
    this.aiDrafting.set(true);
    this.invoiceService.aiDraft(prompt).subscribe({
      next: (draft) => {
        this.aiDrafting.set(false);
        this.items.set(draft.items.map((item) => ({
          uid: this.nextUid++,
          description: item.description,
          hsn: '',
          unit: 'Nos',
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })));
        if (draft.taxPercent) this.taxPercent = draft.taxPercent;
        if (draft.discount) this.discount = draft.discount;
        if (draft.notes && !this.notes) this.notes = draft.notes;
        if (draft.customerName && !this.customerName.trim()) this.customerName = draft.customerName;
        this.toast.success(`${draft.items.length} item(s) drafted — review and adjust`);
      },
      error: () => this.aiDrafting.set(false),
    });
  }

  constructor() {
    effect(() => {
      const id = this.id();
      if (id === 'new') this.initCreate();
      else this.load(Number(id));
    });
  }

  // ------------------------------------------------------------ load / init

  private initCreate(): void {
    this.attachedRecordId = this.recordId() || null;
    this.customerName = this.customer() || '';
    this.customerPhone = this.phone() || '';
    this.customerEmail = this.email() || '';
    if (this.contactId()) this.selectedContactId = Number(this.contactId());
    if (!this.items().length) this.addItem();

    // Contact picker only matters when we are not bound to a record.
    if (!this.attachedRecordId) {
      this.contactsService.list('', 0, 200).subscribe({
        next: (page) => {
          this.contacts.set(page.content);
          if (this.selectedContactId) this.onContactPicked();
        },
      });
    }
  }

  private load(id: number): void {
    this.loading.set(true);
    this.failed.set(false);
    this.invoiceService.get(id).subscribe({
      next: (invoice) => {
        this.invoice.set(invoice);
        this.seed(invoice);
        this.loading.set(false);
        this.invoiceService.payments(id).subscribe({
          next: (payments) => this.payments.set(payments),
        });
      },
      error: () => {
        this.failed.set(true);
        this.loading.set(false);
      },
    });
  }

  private seed(invoice: Invoice): void {
    this.customerName = invoice.customerName;
    this.customerPhone = invoice.customerPhone ?? '';
    this.customerEmail = invoice.customerEmail ?? '';
    this.customerAddress = invoice.customerAddress ?? '';
    this.issueDate = invoice.issueDate;
    this.dueDate = invoice.dueDate ?? '';
    this.taxPercent = invoice.taxPercent;
    this.discount = invoice.discount;
    this.notes = invoice.notes ?? '';
    this.customerGstin = invoice.customerGstin ?? '';
    this.sellerGstin = invoice.sellerGstin ?? '';
    this.gstMode = (invoice.gstMode as 'INTRA' | 'INTER') ?? '';
    this.bankDetails = invoice.bankDetails ?? '';
    this.items.set(invoice.items.map((item) => ({
      uid: this.nextUid++,
      description: item.description,
      hsn: item.hsn ?? '',
      unit: item.unit ?? 'Nos',
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    })));
  }

  onContactPicked(): void {
    const contact = this.contacts().find((c) => c.id === this.selectedContactId);
    if (!contact) return;
    this.customerName = contact.name;
    this.customerPhone = contact.phone ?? '';
    this.customerEmail = contact.email ?? '';
    this.customerAddress = contact.address ?? '';
  }

  // ----------------------------------------------------------------- items

  addItem(): void {
    this.items.update((rows) => [...rows,
      { uid: this.nextUid++, description: '', hsn: '', unit: 'Nos', quantity: 1, unitPrice: 0 }]);
  }

  removeItem(uid: number): void {
    this.items.update((rows) => rows.filter((r) => r.uid !== uid));
  }

  // local mirrors of the server math — preview only
  readonly subtotal = computed(() =>
    this.items().reduce((sum, r) => sum + (r.quantity || 0) * (r.unitPrice || 0), 0));

  taxAmount(): number {
    return (this.subtotal() * (this.taxPercent || 0)) / 100;
  }

  /** Raw total before rounding — mirrors the server. */
  rawTotal(): number {
    return Math.max(0, this.subtotal() + this.taxAmount() - (this.discount || 0));
  }

  grandTotal(): number {
    return Math.round(this.rawTotal());
  }

  roundOffPreview(): number {
    return this.grandTotal() - this.rawTotal();
  }

  /** "Rupees Nine Thousand … Only" — Indian numbering, mirrors the PDF. */
  amountInWords(): string {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight',
      'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
      'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy',
      'Eighty', 'Ninety'];
    const words = (n: number): string => {
      if (n < 20) return ones[n];
      if (n < 100) return (tens[Math.floor(n / 10)] + ' ' + ones[n % 10]).trim();
      if (n < 1000) return (ones[Math.floor(n / 100)] + ' Hundred ' + (n % 100 ? words(n % 100) : '')).trim();
      if (n < 100000) return (words(Math.floor(n / 1000)) + ' Thousand ' + (n % 1000 ? words(n % 1000) : '')).trim();
      if (n < 10000000) return (words(Math.floor(n / 100000)) + ' Lakh ' + (n % 100000 ? words(n % 100000) : '')).trim();
      return (words(Math.floor(n / 10000000)) + ' Crore ' + (n % 10000000 ? words(n % 10000000) : '')).trim();
    };
    const total = this.grandTotal();
    return 'Rupees ' + (total === 0 ? 'Zero' : words(total)) + ' Only';
  }

  lineAmount(row: ItemRow): number {
    return (row.quantity || 0) * (row.unitPrice || 0);
  }

  balance(): number {
    const invoice = this.invoice();
    return invoice ? Math.max(0, invoice.total - invoice.amountPaid) : 0;
  }

  editable(): boolean {
    const invoice = this.invoice();
    return this.isNew() || (!!invoice && invoice.status !== 'PAID' && invoice.status !== 'CANCELLED');
  }

  // ------------------------------------------------------------------ save

  save(): void {
    if (!this.customerName.trim() && !this.selectedContactId && !this.attachedRecordId) {
      this.toast.warning('Pick a contact or enter the customer details');
      return;
    }
    const rows = this.items().filter((r) => r.description.trim());
    if (!rows.length) {
      this.toast.warning('Add at least one item');
      return;
    }
    const input: InvoiceInput = {
      contactId: this.attachedRecordId ? null : this.selectedContactId,
      recordId: this.attachedRecordId,
      customerName: this.customerName.trim(),
      customerPhone: this.customerPhone.trim() || null,
      customerEmail: this.customerEmail.trim() || null,
      customerAddress: this.customerAddress.trim() || null,
      issueDate: this.issueDate || null,
      dueDate: this.dueDate || null,
      taxPercent: this.taxPercent || 0,
      discount: this.discount || 0,
      notes: this.notes.trim() || null,
      customerGstin: this.customerGstin.trim() || null,
      sellerGstin: this.sellerGstin.trim() || null,
      gstMode: this.gstMode || null,
      bankDetails: this.bankDetails.trim() || null,
      items: rows.map((r) => ({
        description: r.description.trim(),
        quantity: r.quantity || 1,
        unitPrice: r.unitPrice || 0,
        hsn: r.hsn.trim() || undefined,
        unit: r.unit || 'Nos',
      })),
    };

    this.saving.set(true);
    const call = this.isNew()
      ? this.invoiceService.create(input)
      : this.invoiceService.update(this.invoice()!.id, input);
    call.subscribe({
      next: (saved) => {
        this.saving.set(false);
        this.toast.success(this.isNew() ? `Invoice ${saved.number} created` : 'Invoice updated');
        if (this.isNew()) {
          this.router.navigate(['/app/invoices', saved.id], { replaceUrl: true });
        } else {
          this.invoice.set(saved);
          this.seed(saved);
        }
      },
      error: () => this.saving.set(false),
    });
  }

  // --------------------------------------------------------------- actions

  downloadPdf(): void {
    const invoice = this.invoice();
    if (!invoice) return;
    this.invoiceService.pdf(invoice.id).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      },
      error: () => this.toast.error('Could not generate the PDF'),
    });
  }

  send(channel: 'EMAIL' | 'WHATSAPP'): void {
    const invoice = this.invoice();
    if (!invoice) return;
    this.sending.set(channel);
    this.invoiceService.send(invoice.id, channel).subscribe({
      next: (saved) => {
        this.sending.set(null);
        this.invoice.set(saved);
        this.toast.success(`Invoice sent on ${channel === 'EMAIL' ? 'email' : 'WhatsApp'}`);
      },
      error: () => this.sending.set(null),
    });
  }

  openPayment(): void {
    this.payAmount = this.balance() || null;
    this.payReference = '';
    this.payDate = new Date().toISOString().slice(0, 10);
    this.paymentOpen.set(true);
  }

  submitPayment(): void {
    const invoice = this.invoice();
    if (!invoice || !this.payAmount || this.payAmount <= 0) {
      this.toast.warning('Enter the amount received');
      return;
    }
    this.invoiceService.recordPayment(invoice.id, {
      amount: this.payAmount,
      paidOn: this.payDate,
      mode: this.payMode,
      reference: this.payReference.trim() || undefined,
    }).subscribe({
      next: (saved) => {
        this.paymentOpen.set(false);
        this.invoice.set(saved);
        this.toast.success(saved.status === 'PAID' ? 'Invoice fully paid 🎉' : 'Payment recorded');
        this.invoiceService.payments(saved.id).subscribe({
          next: (payments) => this.payments.set(payments),
        });
      },
    });
  }

  cancelInvoice(): void {
    const invoice = this.invoice();
    if (!invoice) return;
    this.confirm
      .ask({
        title: 'Cancel this invoice?',
        message: `${invoice.number} will be marked cancelled — it stays in history.`,
        variant: 'danger',
      })
      .subscribe((ok) => {
        if (!ok) return;
        this.invoiceService.cancel(invoice.id).subscribe({
          next: (saved) => {
            this.invoice.set(saved);
            this.toast.success('Invoice cancelled');
          },
        });
      });
  }

  deleteDraft(): void {
    const invoice = this.invoice();
    if (!invoice) return;
    this.confirm
      .ask({
        title: 'Delete this draft?',
        message: 'A deleted draft is gone for good.',
        variant: 'danger',
      })
      .subscribe((ok) => {
        if (!ok) return;
        this.invoiceService.delete(invoice.id).subscribe({
          next: () => {
            this.toast.success('Draft deleted');
            this.router.navigate(['/app/invoices']);
          },
        });
      });
  }

  statusClass(status: string): string {
    switch (status) {
      case 'PAID': return 'text-bg-success';
      case 'PARTIAL': return 'text-bg-warning';
      case 'SENT': return 'text-bg-primary';
      case 'CANCELLED': return 'text-bg-secondary';
      default: return 'text-bg-light border';
    }
  }
}

import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { ConfirmService } from '../../../core/services/confirm.service';
import { ToastService } from '../../../core/services/toast.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { ErrorStateComponent } from '../../../shared/components/state/state-views.component';
import { CommPanelComponent } from '../../outreach/comm-panel.component';
import { TaskPanelComponent } from '../../tasks/task-panel.component';
import { Contact, ContactInput, ContactsService } from '../contacts.service';

/**
 * Full-page contact view — details editable inline (no popup), and the whole
 * conversation with this person right below: WhatsApp chat + email history,
 * with send buttons (free text or approved template) on the same page.
 */
@Component({
  selector: 'app-contact-detail',
  standalone: true,
  imports: [FormsModule, RouterLink, PageHeaderComponent, ErrorStateComponent, CommPanelComponent, TaskPanelComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './contact-detail.component.html',
  styleUrl: './contact-detail.component.css',
})
export class ContactDetailComponent {
  private readonly contactsService = inject(ContactsService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly router = inject(Router);

  /** 'new' => create mode. */
  readonly id = input.required<string>();

  readonly isNew = computed(() => this.id() === 'new');
  readonly loading = signal(false);
  readonly failed = signal(false);
  readonly saving = signal(false);
  readonly contact = signal<Contact | null>(null);

  draft: ContactInput = { name: '', phone: '', email: '', company: '', address: '', notes: '' };

  /** Non-blocking duplicate warning — other contacts already on this phone/email. */
  readonly duplicateHits = signal<{ id: number; name: string; phone: string; email: string }[]>([]);
  private duplicateTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    effect(() => {
      const id = this.id();
      if (id && id !== 'new') this.load(Number(id));
    });
  }

  private load(id: number): void {
    this.loading.set(true);
    this.failed.set(false);
    this.contactsService.get(id).subscribe({
      next: (contact) => {
        this.contact.set(contact);
        this.draft = {
          name: contact.name,
          phone: contact.phone ?? '',
          email: contact.email ?? '',
          company: contact.company ?? '',
          address: contact.address ?? '',
          notes: contact.notes ?? '',
        };
        this.loading.set(false);
      },
      error: () => {
        this.failed.set(true);
        this.loading.set(false);
      },
    });
  }

  /** Debounced check as the phone/email fields change; a warning, never a block. */
  checkDuplicates(): void {
    if (this.duplicateTimer) clearTimeout(this.duplicateTimer);
    this.duplicateTimer = setTimeout(() => {
      const phone = this.draft.phone?.trim() || null;
      const email = this.draft.email?.trim() || null;
      if (!phone && !email) {
        this.duplicateHits.set([]);
        return;
      }
      const exclude = this.contact()?.id;
      this.contactsService.duplicates(phone, email, exclude).subscribe({
        next: (hits) => this.duplicateHits.set(hits),
        error: () => this.duplicateHits.set([]),
      });
    }, 400);
  }

  save(): void {
    if (!this.draft.name?.trim()) {
      this.toast.warning('Name is required');
      return;
    }
    if (!this.draft.phone?.trim() && !this.draft.email?.trim()) {
      this.toast.warning('Add at least a phone number or an email');
      return;
    }
    this.saving.set(true);
    const existing = this.contact();
    const request = existing
      ? this.contactsService.update(existing.id, this.draft)
      : this.contactsService.create(this.draft);
    request.subscribe({
      next: (saved) => {
        this.saving.set(false);
        this.toast.success(existing ? 'Contact updated' : 'Contact saved');
        if (!existing) {
          this.router.navigate(['/app/contacts', saved.id], { replaceUrl: true });
        } else {
          this.contact.set(saved);
        }
      },
      error: () => this.saving.set(false),
    });
  }

  remove(): void {
    const contact = this.contact();
    if (!contact) return;
    this.confirm.confirmDelete(`contact "${contact.name}"`).subscribe((ok) => {
      if (!ok) return;
      this.contactsService.delete(contact.id).subscribe({
        next: () => {
          this.toast.success('Contact deleted');
          this.router.navigate(['/app/contacts']);
        },
      });
    });
  }
}

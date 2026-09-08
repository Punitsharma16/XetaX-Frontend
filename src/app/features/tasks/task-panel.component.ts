import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ToastService } from '../../core/services/toast.service';
import { TaskItem, TaskService } from './task.service';

/**
 * Tasks & reminders for one contact/record (linked mode) or the signed-in
 * user (personal mode, no inputs). Reminder channels asked at create time:
 * panel notification is always on; email / WhatsApp are opt-in.
 */
@Component({
  selector: 'app-task-panel',
  standalone: true,
  imports: [DatePipe, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './task-panel.component.html',
  styleUrl: './task-panel.component.css',
})
export class TaskPanelComponent {
  private readonly taskService = inject(TaskService);
  private readonly toast = inject(ToastService);

  readonly contactId = input<number | undefined>(undefined);
  readonly recordId = input<string | undefined>(undefined);
  readonly linkedName = input<string>('');
  /** 'OPEN' | 'DONE' — personal mode list filter. */
  readonly personal = input(false);

  readonly tasks = signal<TaskItem[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly composerOpen = signal(false);
  readonly showDone = signal(false);

  title = '';
  notes = '';
  dueAt = '';
  remindEmail = false;
  remindWhatsApp = false;

  constructor() {
    effect(() => {
      // re-load whenever the linked entity or the done-filter changes
      this.contactId();
      this.recordId();
      this.showDone();
      this.load();
    });
  }

  load(): void {
    this.loading.set(true);
    const done = () => this.loading.set(false);
    const contactId = this.contactId();
    const recordId = this.recordId();
    const apply = (tasks: TaskItem[]) => {
      const filtered = this.personal()
        ? tasks
        : tasks.filter((t) => (this.showDone() ? true : t.status === 'OPEN'));
      this.tasks.set(filtered);
      done();
    };
    if (contactId) {
      this.taskService.forContact(contactId).subscribe({ next: apply, error: done });
    } else if (recordId) {
      this.taskService.forRecord(recordId).subscribe({ next: apply, error: done });
    } else {
      this.taskService.mine(this.showDone() ? 'DONE' : 'OPEN').subscribe({ next: apply, error: done });
    }
  }

  save(): void {
    if (!this.title.trim()) {
      this.toast.warning('Please enter a task title');
      return;
    }
    if ((this.remindEmail || this.remindWhatsApp) && !this.dueAt) {
      this.toast.warning('Pick a due date/time for the reminder');
      return;
    }
    this.saving.set(true);
    this.taskService
      .create({
        title: this.title.trim(),
        notes: this.notes.trim() || undefined,
        dueAt: this.dueAt || null,
        contactId: this.contactId() ?? null,
        recordId: this.recordId() ?? null,
        linkedName: this.linkedName() || null,
        remindEmail: this.remindEmail,
        remindWhatsApp: this.remindWhatsApp,
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.composerOpen.set(false);
          this.title = this.notes = this.dueAt = '';
          this.remindEmail = this.remindWhatsApp = false;
          this.toast.success('Task saved', 'You will get a panel notification when it is due.');
          this.load();
        },
        error: () => this.saving.set(false),
      });
  }

  toggleDone(task: TaskItem): void {
    this.taskService.setDone(task.id, task.status !== 'DONE').subscribe({ next: () => this.load() });
  }

  remove(task: TaskItem): void {
    this.taskService.delete(task.id).subscribe({ next: () => this.load() });
  }

  /** Quick due-time chips — writes datetime-local format (local time). */
  preset(kind: 'hour' | 'evening' | 'tomorrow'): void {
    const d = new Date();
    if (kind === 'hour') d.setHours(d.getHours() + 1);
    if (kind === 'evening') d.setHours(18, 0, 0, 0);
    if (kind === 'tomorrow') {
      d.setDate(d.getDate() + 1);
      d.setHours(10, 0, 0, 0);
    }
    const pad = (n: number) => String(n).padStart(2, '0');
    this.dueAt = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  isOverdue(task: TaskItem): boolean {
    return task.status === 'OPEN' && !!task.dueAt && new Date(task.dueAt).getTime() < Date.now();
  }
}

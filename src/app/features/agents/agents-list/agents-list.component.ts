import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { ConfirmService } from '../../../core/services/confirm.service';
import { ToastService } from '../../../core/services/toast.service';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import {
  EmptyStateComponent,
  ErrorStateComponent,
  TableSkeletonComponent,
} from '../../../shared/components/state/state-views.component';
import { Agent, AgentService } from '../agent.service';
import { AiUsagePanelComponent } from '../../billing/ai-usage-panel.component';

@Component({
  selector: 'app-agents-list',
  standalone: true,
  imports: [
    AiUsagePanelComponent,
    FormsModule,
    RouterLink,
    ModalComponent,
    PageHeaderComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    TableSkeletonComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './agents-list.component.html',
  styleUrl: './agents-list.component.css',
})
export class AgentsListComponent {
  private readonly agents = inject(AgentService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);

  readonly loading = signal(true);
  readonly error = signal(false);
  readonly list = signal<Agent[]>([]);

  readonly createOpen = signal(false);
  readonly saving = signal(false);
  name = '';
  persona = '';
  welcome = '';
  color = '#4f46e5';

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    this.agents.list().subscribe({
      next: (agents) => {
        this.list.set(agents);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set(true);
      },
    });
  }

  create(): void {
    if (!this.name.trim()) {
      this.toast.warning('Name missing', 'Agent ka naam do (e.g. Support Bot).');
      return;
    }
    this.saving.set(true);
    this.agents
      .create({
        name: this.name.trim(),
        persona: this.persona.trim() || undefined,
        welcomeMessage: this.welcome.trim() || undefined,
        themeColor: this.color,
      })
      .subscribe({
        next: (agent) => {
          this.saving.set(false);
          this.createOpen.set(false);
          this.name = this.persona = this.welcome = '';
          this.list.update((agents) => [agent, ...agents]);
          this.toast.success('Agent created', 'Now add knowledge — a PDF, a URL or plain text.');
        },
        error: () => this.saving.set(false),
      });
  }

  remove(agent: Agent): void {
    this.confirm.confirmDelete(`agent '${agent.name}'`).subscribe((ok) => {
      if (!ok) return;
      this.agents.delete(agent.id).subscribe({
        next: () => {
          this.list.update((agents) => agents.filter((a) => a.id !== agent.id));
          this.toast.success('Agent deleted', agent.name);
        },
      });
    });
  }
}

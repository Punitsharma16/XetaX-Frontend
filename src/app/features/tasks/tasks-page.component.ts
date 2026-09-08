import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { TaskPanelComponent } from './task-panel.component';

/** Personal to-dos — the same panel that lives on contact/record pages. */
@Component({
  selector: 'app-tasks-page',
  standalone: true,
  imports: [PageHeaderComponent, TaskPanelComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header
      title="My tasks"
      icon="bi-check2-square"
      subtitle="Personal to-dos and reminders — get notified on the panel, by email or on WhatsApp when they are due."
    />
    <app-task-panel [personal]="true" />
  `,
})
export class TasksPageComponent {}

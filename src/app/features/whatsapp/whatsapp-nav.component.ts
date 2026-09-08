import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

/**
 * Pill-style sub-navigation shared by every WhatsApp page, so the sidebar
 * needs only one "WhatsApp" entry and moving between Setup / Inbox /
 * Campaigns feels like one product area.
 */
@Component({
  selector: 'app-whatsapp-nav',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav class="wa-nav" aria-label="WhatsApp sections">
      <a
        class="wa-nav__pill"
        routerLink="/app/whatsapp"
        routerLinkActive="is-active"
        [routerLinkActiveOptions]="{ exact: true }"
      >
        <i class="bi bi-gear"></i> Setup
      </a>
      <a class="wa-nav__pill" routerLink="/app/whatsapp/conversations" routerLinkActive="is-active">
        <i class="bi bi-chat-dots"></i> Inbox
      </a>
      <a class="wa-nav__pill" routerLink="/app/whatsapp/campaigns" routerLinkActive="is-active">
        <i class="bi bi-megaphone"></i> Campaigns
      </a>
    </nav>
  `,
  styles: [
    `
      .wa-nav {
        display: inline-flex;
        gap: 4px;
        padding: 4px;
        border-radius: var(--radius-pill, 999px);
        background: var(--surface-sunken, #f1f3f5);
        border: 1px solid var(--border-subtle, #e9ecef);
        margin-bottom: 1rem;
      }
      .wa-nav__pill {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        padding: 0.35rem 0.9rem;
        border-radius: var(--radius-pill, 999px);
        font-size: 0.8rem;
        font-weight: 600;
        color: var(--text-secondary, #495057);
        text-decoration: none;
        transition: background 0.15s ease, color 0.15s ease;
      }
      .wa-nav__pill:hover {
        color: var(--wa-600);
      }
      .wa-nav__pill.is-active {
        background: var(--surface-card, #fff);
        color: var(--wa-600);
        box-shadow: var(--shadow-sm);
      }
    `,
  ],
})
export class WhatsAppNavComponent {}

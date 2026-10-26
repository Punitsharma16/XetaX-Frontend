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
      <a class="wa-nav__pill" routerLink="/app/whatsapp/flows" routerLinkActive="is-active">
        <i class="bi bi-ui-checks-grid me-1"></i>Flows
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
        max-width: 100%;
        overflow-x: auto;
        scrollbar-width: none;
        border-radius: var(--radius-pill);
        background: var(--surface-sunken);
        border: 1px solid var(--border-subtle);
        margin-bottom: 1.25rem;
      }
      .wa-nav::-webkit-scrollbar {
        display: none;
      }
      .wa-nav__pill {
        display: inline-flex;
        flex: 0 0 auto;
        align-items: center;
        gap: 0.4rem;
        padding: 0.4rem 0.95rem;
        border-radius: var(--radius-pill);
        font-size: 0.8rem;
        font-weight: 600;
        white-space: nowrap;
        color: var(--text-secondary);
        text-decoration: none;
        transition: background var(--transition-fast), color var(--transition-fast);
      }
      .wa-nav__pill:hover {
        color: var(--wa-600);
      }
      .wa-nav__pill:focus-visible {
        outline: none;
        box-shadow: var(--focus-ring);
      }
      .wa-nav__pill .me-1 {
        margin-right: 0 !important;
      }
      .wa-nav__pill.is-active {
        background: var(--surface-card);
        color: var(--wa-600);
        box-shadow: var(--shadow-sm);
      }
    `,
  ],
})
export class WhatsAppNavComponent {}

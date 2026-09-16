import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';

import { ToastService } from '../../core/services/toast.service';

/**
 * The file on a WhatsApp message — shown inline where a browser can render it,
 * and as a download row where it cannot.
 *
 * <p>The backend pulls each inbound file off Meta once and serves it from a
 * public, unguessable link (/api/public/whatsapp/media/{key}), so the plain
 * src/href here needs no token and the same link can be shared with anyone.
 * Inputs are taken one by one rather than as a message object, so both the
 * inbox thread and the record chat panel can use this with their own types.
 */
@Component({
  selector: 'app-chat-media',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (url()) {
      <div class="cm">
        @switch (kind()) {
          @case ('image') {
            <a [href]="url()" target="_blank" rel="noopener">
              <img class="cm__img" [src]="url()" [alt]="filename() || 'Photo'" loading="lazy" />
            </a>
          }
          @case ('video') {
            <video class="cm__video" [src]="url()" controls preload="metadata"></video>
          }
          @case ('audio') {
            <audio class="cm__audio" [src]="url()" controls preload="none"></audio>
          }
          @default {
            <a class="cm__file" [href]="url()" target="_blank" rel="noopener">
              <i class="bi bi-file-earmark-arrow-down"></i>
              <span class="cm__name">{{ filename() || 'Attachment' }}</span>
              @if (readableSize()) { <span class="cm__size">{{ readableSize() }}</span> }
            </a>
          }
        }

        <div class="cm__actions">
          <a class="cm__action" [href]="url() + '?download=true'" target="_blank" rel="noopener"
             title="Download this file">
            <i class="bi bi-download"></i>
          </a>
          <button type="button" class="cm__action" (click)="copy()" title="Copy the shareable link">
            <i class="bi bi-link-45deg"></i>
          </button>
        </div>
      </div>
    }
  `,
  styles: [`
    .cm { margin: 0.25rem 0; }
    .cm__img {
      max-width: 220px; max-height: 220px; width: auto; height: auto;
      border-radius: 8px; display: block; object-fit: cover;
    }
    .cm__video { max-width: 240px; border-radius: 8px; display: block; }
    .cm__audio { max-width: 240px; height: 34px; display: block; }
    .cm__file {
      display: inline-flex; align-items: center; gap: 0.4rem;
      padding: 0.35rem 0.55rem; border-radius: 8px; text-decoration: none;
      background: var(--surface-muted, #f1f3f5); color: inherit; max-width: 240px;
    }
    .cm__file:hover { background: var(--surface-hover, #e9ecef); }
    .cm__name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .cm__size { font-size: 0.66rem; color: var(--text-muted, #6c757d); flex: none; }
    .cm__actions { display: flex; gap: 0.15rem; margin-top: 2px; }
    .cm__action {
      border: 0; background: none; padding: 0 0.2rem; line-height: 1;
      font-size: 0.8rem; color: var(--text-muted, #6c757d); cursor: pointer; text-decoration: none;
    }
    .cm__action:hover { color: var(--bs-primary, #0d6efd); }
  `],
})
export class ChatMediaComponent {
  private readonly toast = inject(ToastService);

  readonly url = input<string | null | undefined>(null);
  readonly messageType = input<string | null | undefined>(null);
  readonly mime = input<string | null | undefined>(null);
  readonly filename = input<string | null | undefined>(null);
  readonly size = input<number | null | undefined>(null);

  /** How to show it: the mime type is the truth, the message type the fallback. */
  readonly kind = computed(() => {
    const mime = (this.mime() || '').toLowerCase();
    if (mime.startsWith('image/')) return 'image';
    if (mime.startsWith('video/')) return 'video';
    if (mime.startsWith('audio/')) return 'audio';
    const type = (this.messageType() || '').toUpperCase();
    if (type === 'IMAGE' || type === 'STICKER') return 'image';
    if (type === 'VIDEO') return 'video';
    if (type === 'AUDIO') return 'audio';
    return 'file';
  });

  readonly readableSize = computed(() => {
    const bytes = this.size();
    if (!bytes || bytes <= 0) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  });

  copy(): void {
    const link = this.url();
    if (!link) return;
    navigator.clipboard?.writeText(link).then(
      () => this.toast.success('Link copied', 'Anyone with this link can open the file.'),
      () => this.toast.error('Copy failed', 'Your browser blocked clipboard access.'),
    );
  }
}

import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { TokenStorageService } from '../../core/authentication/token-storage.service';

/**
 * AI assistant API — AiChatController, @RequestMapping("/api/ai").
 *
 *   POST /api/ai/chat  { message, conversationId } → { response }
 *
 * The endpoint returns the raw ChatResponseDto (no ApiResponse envelope),
 * which is why HttpClient is used directly instead of CrmApiService. The
 * authenticated user is resolved server-side from the JWT; conversation
 * memory lives in Redis keyed by conversationId.
 *
 * NOTE: the backend does not stream and does not emit per-tool execution
 * events yet — one request returns one final answer. The workspace UI is
 * built so a streaming/tool-event endpoint can slot in later.
 */
@Injectable({ providedIn: 'root' })
export class AiChatService {
  private readonly http = inject(HttpClient);
  private readonly tokens = inject(TokenStorageService);
  private readonly base = `${environment.crmBaseUrl}/api/ai`;

  chat(message: string, conversationId: string): Observable<{ response: string }> {
    return this.http.post<{ response: string }>(`${this.base}/chat`, { message, conversationId });
  }

  /**
   * Streaming chat (SSE over fetch — HttpClient buffers, so it can't paint
   * tokens as they arrive). Calls onToken per token; resolves when the
   * stream completes. Throws on HTTP errors so callers can fall back.
   */
  async chatStream(message: string, conversationId: string, onToken: (t: string) => void): Promise<void> {
    const response = await fetch(`${this.base}/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.tokens.accessToken ?? ''}`,
      },
      body: JSON.stringify({ message, conversationId }),
    });
    if (!response.ok || !response.body) {
      throw new Error(`stream failed: ${response.status}`);
    }
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      // SSE events are separated by a blank line; data may span several lines.
      let idx: number;
      while ((idx = buffer.indexOf('\n\n')) >= 0) {
        const event = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);
        const data = event
          .split('\n')
          .filter((l) => l.startsWith('data:'))
          .map((l) => l.slice(5))
          .join('\n');
        if (data) onToken(data);
      }
    }
  }
}

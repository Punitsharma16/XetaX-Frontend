import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { CrmApiService } from '../../core/services/crm-api.service';
import { environment } from '../../../environments/environment';

export interface Agent {
  id: number;
  name: string;
  publicKey: string;
  persona: string | null;
  welcomeMessage: string | null;
  themeColor: string;
  status: 'ACTIVE' | 'DISABLED';
  sourceCount: number;
}

export interface AgentSource {
  id: number;
  type: 'PDF' | 'URL' | 'TEXT';
  name: string;
  status: 'INDEXED' | 'FAILED';
  chunkCount: number;
  contentChars: number;
  error: string | null;
  createdAt: string;
}


export interface StageHint {
  stageId: number;
  /** Legacy only — old configs may still carry a status; the UI never sends one. */
  statusId?: number | null;
  hint: string;
}

export interface AgentChannelConfig {
  agentId: number;
  whatsappEnabled: boolean;
  whatsappScope: 'ALL' | 'CAMPAIGN';
  pipelineMode: 'SUGGEST' | 'AUTO';
  targetFormId: number | null;
  stageHints: StageHint[];
  handoffKeywords: string;
  maxAiTurns: number;
  websiteWaitMinutes: number;
  captureFields: boolean;
}

/** Public chatbot agents — /api/agents (agents.manage permission). */
@Injectable({ providedIn: 'root' })
export class AgentService {
  private readonly api = inject(CrmApiService);
  private readonly path = '/api/agents';

  list(): Observable<Agent[]> {
    return this.api.get<Agent[]>(this.path);
  }

  get(id: number): Observable<Agent> {
    return this.api.get<Agent>(`${this.path}/${id}`);
  }

  create(body: Partial<Agent>): Observable<Agent> {
    return this.api.post<Agent>(this.path, body);
  }

  update(id: number, body: Partial<Agent>): Observable<Agent> {
    return this.api.put<Agent>(`${this.path}/${id}`, body);
  }

  delete(id: number): Observable<string> {
    return this.api.delete(`${this.path}/${id}`);
  }

  /* ---- channels & pipeline (WhatsApp autopilot, record creation, hand-off) ---- */
  channels(id: number): Observable<AgentChannelConfig> {
    return this.api.get<AgentChannelConfig>(`${this.path}/${id}/channels`, undefined, { quiet: true });
  }

  saveChannels(id: number, body: Partial<AgentChannelConfig>): Observable<AgentChannelConfig> {
    return this.api.put<AgentChannelConfig>(`${this.path}/${id}/channels`, body);
  }

  sources(id: number): Observable<AgentSource[]> {
    return this.api.get<AgentSource[]>(`${this.path}/${id}/sources`);
  }

  addPdf(id: number, file: File): Observable<AgentSource> {
    const form = new FormData();
    form.append('file', file);
    return this.api.post<AgentSource>(`${this.path}/${id}/sources/pdf`, form);
  }

  addUrl(id: number, url: string): Observable<AgentSource> {
    return this.api.post<AgentSource>(`${this.path}/${id}/sources/url`, { url });
  }

  addText(id: number, name: string, text: string): Observable<AgentSource> {
    return this.api.post<AgentSource>(`${this.path}/${id}/sources/text`, { name, text });
  }

  deleteSource(id: number, sourceId: number): Observable<string> {
    return this.api.delete(`${this.path}/${id}/sources/${sourceId}`);
  }

  /* ---- public endpoints (playground uses the same path visitors use) ---- */

  embedSnippet(agent: Agent): string {
    return `<script src="${environment.crmBaseUrl}/api/public/agents/${agent.publicKey}/widget.js" async></script>`;
  }

  publicChat(publicKey: string, sessionId: string, message: string): Observable<{ reply: string }> {
    return this.api.post<{ reply: string }>(`/api/public/agents/${publicKey}/chat`, {
      sessionId,
      message,
    });
  }
}

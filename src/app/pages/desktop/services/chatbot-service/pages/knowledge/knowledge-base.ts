import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { BaseService } from '../../../../../../acore/base/base.service';
import { Loader } from '../../../../../../acore/components/loader/loader';
import { UrlConstants } from '../../../../../../acore/util/url';

export interface BotListItem {
  id?: number;
  botId?: string;
  name: string;
  role?: string;
  language?: string;
  tone?: string;
  status?: string;
  description?: string;
  createdAt?: string;
  knowledgeSources?: { type: string; count: number }[];
}

@Component({
  selector: 'app-knowledge-base',
  standalone: true,
  imports: [CommonModule, FormsModule, Loader],
  templateUrl: './knowledge-base.html',
  styleUrls: ['./knowledge-base.css']
})
export class KnowledgeBase implements OnInit {
  botId: string | null = null;
  selectedBot: BotListItem | null = null;

  kbTrainingType = signal<'pdf' | 'website' | 'content'>('pdf');
  kbUploadedFiles = signal<File[]>([]);
  kbWebsiteUrl = signal('');
  kbCustomContent = signal('');
  kbIsSubmitting = signal(false);
  kbError = signal('');
  kbSuccess = signal('');

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private service: BaseService,
    private http: HttpClient
  ) {}

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.botId = id;
        this.fetchBotById(id);
      }
    });
  }

  fetchBotById(id: string) {
    this.service.showLoader();
    this.service.getDataFromAPI(UrlConstants.GET_ALL_BOTS, 'json', true).subscribe({
      next: (response: any) => {
        const list = Array.isArray(response) ? response : response?.data || response?.bots || [];
        const bot = list.find((b: any) => String(b.botId || b.id) === id);
        if (bot) {
          this.selectedBot = bot;
        }
        this.service.hideLoader();
      },
      error: () => this.service.hideLoader()
    });
  }

  setKbTrainingType(type: 'pdf' | 'website' | 'content') {
    this.kbTrainingType.set(type);
    this.kbError.set('');
    this.kbSuccess.set('');
  }

  onKbFilesSelected(event: any) {
    const files = Array.from(event.target.files || []) as File[];
    this.kbUploadedFiles.update(current => [...current, ...files]);
    this.kbError.set('');
  }

  removeKbFile(index: number) {
    this.kbUploadedFiles.update(files => files.filter((_, i) => i !== index));
  }

  submitKnowledge() {
    const botId = this.botId || this.selectedBot?.botId || this.selectedBot?.id;
    if (!botId) return;

    const type = this.kbTrainingType();
    const url = UrlConstants.getBotKnowledgeBaseUrl(botId);
    this.kbError.set('');
    this.kbSuccess.set('');

    if (type === 'pdf') {
      if (this.kbUploadedFiles().length === 0) {
        this.kbError.set('Please select at least one file to upload');
        return;
      }
      this.uploadFiles(url, botId);
    } else if (type === 'website') {
      if (!this.kbWebsiteUrl()) {
        this.kbError.set('Please enter a website URL');
        return;
      }
      this.submitJson(url, { contentType: 'website', websiteUrl: this.kbWebsiteUrl() });
    } else if (type === 'content') {
      if (!this.kbCustomContent()) {
        this.kbError.set('Please enter some content');
        return;
      }
      this.submitJson(url, { contentType: 'content', websiteUrl: this.kbCustomContent() });
    }
  }

  private uploadFiles(url: string, botId: string | number) {
    this.kbIsSubmitting.set(true);
    this.service.showLoader();

    const formData = new FormData();
    formData.append('type', 'pdf');
    this.kbUploadedFiles().forEach(file => formData.append('files', file, file.name));

    const token = localStorage.getItem('access_token');
    const headers: any = {};
    if (token) {
      headers['Authorization'] = 'Bearer ' + token;
    }

    this.http.post(url, formData, { headers, responseType: 'json' }).subscribe({
      next: () => {
        this.service.hideLoader();
        this.kbIsSubmitting.set(false);
        this.kbSuccess.set('Files uploaded successfully');
        this.kbUploadedFiles.set([]);
      },
      error: (error) => {
        this.service.hideLoader();
        this.kbIsSubmitting.set(false);
        this.kbError.set(error?.message || 'Failed to upload files');
      }
    });
  }

  private submitJson(url: string, body: any) {
    this.kbIsSubmitting.set(true);
    this.service.showLoader();

    this.service.postDataFromAPI(url, body, 'json', true).subscribe({
      next: () => {
        this.service.hideLoader();
        this.kbIsSubmitting.set(false);
        this.kbSuccess.set('Knowledge added successfully');
        this.kbWebsiteUrl.set('');
        this.kbCustomContent.set('');
      },
      error: (error) => {
        this.service.hideLoader();
        this.kbIsSubmitting.set(false);
        this.kbError.set(typeof error === 'string' ? error : 'Failed to save knowledge');
      }
    });
  }

  backToList() {
    this.router.navigate(['/pages/bot']);
  }
}

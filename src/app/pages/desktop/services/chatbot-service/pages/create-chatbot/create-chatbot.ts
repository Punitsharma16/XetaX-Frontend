import { Component, computed, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

import { ActivatedRoute, Router } from '@angular/router';
import { BaseService } from '../../../../../../acore/base/base.service';
import { Loader } from '../../../../../../acore/components/loader/loader';
import { UrlConstants } from '../../../../../../acore/util/url';
import { SessionObject } from '../../../../../../acore/util/session-objects';
import { BotDto } from './botDto';

export interface BotListItem {
  id?: number;
  userId?: string;
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
  selector: 'app-create-chatbot',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    Loader
  ],
  templateUrl: './create-chatbot.html',
  styleUrls: ['./create-chatbot.css']
})
export class CreateChatbot implements OnInit {
  UrlConstants = UrlConstants;

  currentMode: 'list' | 'training' = 'list';
  bots = signal<BotListItem[]>([]);
  selectedBot: BotListItem | null = null;

  bot: BotDto = {
    name: '',
    botId: '',
    systemPrompt: '',
    tone: '',
    description: '',
    welcomeMessage: '',
    role: '',
    color: '',
    maxResponseLength: 500,
    position: '',
    botScript: '',
    language: '',
    rules: '',
    userId: ''
  };

  botFlowSteps = [
    {
      title: 'General',
      subtitle: 'Basic details',
      icon: 'bi bi-sliders2',
      iconBg: 'primary'
    },
    {
      title: 'AI Behaviour',
      subtitle: 'Prompt & rules',
      icon: 'bi bi-stars',
      iconBg: 'warning'
    },
    {
      title: 'Appearance',
      subtitle: 'Widget styling',
      icon: 'bi bi-palette',
      iconBg: 'info'
    },
  ];

  tones = [
    'Friendly',
    'Professional',
    'Technical',
    'Sales',
    'Support'
  ];

  selectedStep: string = 'General';

  stepNames = ['General', 'AI Behaviour', 'Appearance'];

  isSubmitting = signal(false);

  get stepIndex(): number {
    return this.stepNames.indexOf(this.selectedStep);
  }

  get completedStepsCount(): number {
    return this.stepNames.filter(s => this.isStepCompleted(s)).length;
  }

  get totalSteps(): number {
    return this.botFlowSteps.length;
  }

  isStepActiveOrPast(index: number): boolean {
    return index <= this.stepIndex || this.isStepCompleted(this.stepNames[index]);
  }

  nextStep() {
    const idx = this.stepIndex;
    if (idx < this.stepNames.length - 1) {
      this.selectedStep = this.stepNames[idx + 1];
    }
  }

  prevStep() {
    const idx = this.stepIndex;
    if (idx > 0) {
      this.selectedStep = this.stepNames[idx - 1];
    }
  }

  chatbotForm: FormGroup;

  showEmbedForBot: BotListItem | null = null;

  origin = window.location.origin;


  generatedScript = computed(() => {
    const botName = this.chatbotForm.get('name')?.value || 'AI_ASSISTANT';
    const id = this.selectedBot?.botId || this.selectedBot?.id || '';
    const botIdAttr = id ? `data-bot-id="${id}"` : '';
    const userId = this.selectedBot?.userId || '';
    return `<script src="${this.origin}/widget.js" data-bot-name="${botName}" ${botIdAttr} data-user-id="${userId}"></script>`;
  });

  getEmbedScript(bot: BotListItem): string {
    const id = bot.botId || bot.id || '';
    return `<script src="${this.origin}/widget.js" data-bot-id="${id}" data-bot-name="${bot.name}" data-user-id="${bot.userId}"></script>`;
  }

  getWidgetEndpoint(bot: BotListItem): string {
    const id = bot.botId || bot.id || '';
    return UrlConstants.getChatScriptApi('{userId}', id);
  }

  getSelectedBotWidgetEndpoint(): string {
    if (!this.selectedBot) return '';
    const id = this.selectedBot.botId || this.selectedBot.id || '';
    return UrlConstants.getChatScriptApi('{userId}', id);
  }

  constructor(
    private fb: FormBuilder,
    private service: BaseService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.chatbotForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      systemPrompt: ['', Validators.required],
      description: [''],
      maxResponseLength: [500],
      tone: ['Professional'],
      welcomeMessage: ['Hi 👋 How can I help you today?'],
      role: ['Customer Support'],
      botScript: [''],
      language: ['English'],
      rules: this.fb.array([
        this.fb.control('Answer clearly and concisely')
      ]),
      appearance: this.fb.group({
        primaryColor: ['#0d6efd'],
        widgetPosition: ['Right'],
        avatarUrl: ['']
      }),
    });
  }

  ngOnInit() {
    this.fetchBots();
  }

  get botStats() {
    const all = this.bots();
    return {
      total: all.length,
      active: all.filter(b => b.status === 'ACTIVE').length,
      draft: all.filter(b => b.status !== 'ACTIVE').length,
      knowledgeSources: all.reduce((sum, b) => sum + (b.knowledgeSources?.length || 0), 0)
    };
  }

  fetchBots() {
    this.service.showLoader();
    this.service.getDataFromAPI(UrlConstants.GET_ALL_BOTS, 'json', true).subscribe({
      next: (response: any) => {
        const list = Array.isArray(response) ? response : response?.data || response?.bots || [];
        this.bots.set(list);
        this.service.hideLoader();
      },
      error: (error) => {
        console.error('Error fetching bots', error);
        this.bots.set([]);
        this.service.hideLoader();
      }
    });
  }

  trainBot(bot: BotListItem) {
    this.selectedBot = bot;
    this.chatbotForm.patchValue({
      name: bot.name || '',
      role: bot.role || 'Customer Support',
      language: bot.language || 'English',
      tone: bot.tone || 'Professional',
      description: bot.description || '',
    });
    this.currentMode = 'training';
    this.selectedStep = 'General';
  }

  openKnowledgeBase(bot: BotListItem) {
    this.router.navigate([`/pages/bot/${bot.botId || bot.id}/knowledge`]);
  }

  createNewBot() {
    this.selectedBot = null;
    this.chatbotForm.reset({
      name: '',
      systemPrompt: '',
      description: '',
      maxResponseLength: 500,
      tone: 'Professional',
      welcomeMessage: 'Hi 👋 How can I help you today?',
      role: 'Customer Support',
      botScript: '',
      language: 'English',
    });
    this.rules.clear();
    this.rules.push(this.fb.control('Answer clearly and concisely'));
    this.appearanceGroup.reset({
      primaryColor: '#0d6efd',
      widgetPosition: 'Right',
      avatarUrl: ''
    });
    this.currentMode = 'training';
    this.selectedStep = 'General';
  }

  backToList() {
    this.currentMode = 'list';
    this.selectedBot = null;
    this.isSubmitting.set(false);
    this.router.navigate(['/pages/bot']);
  }

  get appearanceGroup(): FormGroup {
    return this.chatbotForm.get('appearance') as FormGroup;
  }

  get rules(): FormArray {
    return this.chatbotForm.get('rules') as FormArray;
  }

  addRule() {
    this.rules.push(this.fb.control(''));
  }

  removeRule(index: number) {
    if (this.rules.length === 1) {
      return;
    }
    this.rules.removeAt(index);
  }

  onSelectStep(step: string) {
    this.selectedStep = step;
  }

  createBot() {
    if (this.chatbotForm.invalid) {
      this.chatbotForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.service.showLoader();

    try {
      this.bot.name = this.chatbotForm.get('name')?.value;
      this.bot.systemPrompt = this.chatbotForm.get('systemPrompt')?.value;
      this.bot.tone = this.chatbotForm.get('tone')?.value;
      this.bot.welcomeMessage = this.chatbotForm.get('welcomeMessage')?.value;
      this.bot.role = this.chatbotForm.get('role')?.value;
      this.bot.botScript = this.generatedScript();
      this.bot.language = this.chatbotForm.get('language')?.value;
      this.bot.rules = this.rules.value.join(', ');
      this.bot.color = this.appearanceGroup.get('primaryColor')?.value;
      this.bot.position = this.appearanceGroup.get('widgetPosition')?.value;

      const isUpdate = !!this.selectedBot;
      if (isUpdate) {
        this.bot.botId = this.selectedBot!.botId || '';
      }

      const endpoint = isUpdate
        ? UrlConstants.BOT_UPDATE + (this.selectedBot!.botId || this.selectedBot!.id)
        : UrlConstants.BOT_CREATE;

      this.service.postDataFromAPI(endpoint, this.bot, 'json', true).subscribe({
        next: (response) => {
          console.log('Bot created/updated successfully', response);
          this.service.hideLoader();
          this.isSubmitting.set(false);
          this.backToList();
        },
        error: (error) => {
          console.error('Error creating bot', error);
          this.service.hideLoader();
          this.isSubmitting.set(false);
        }
      });
    } catch (error) {
      console.error(error);
      this.service.hideLoader();
      this.isSubmitting.set(false);
    }
  }

  get completionPercentage(): number {
    let completed = 0;
    if (this.chatbotForm.get('name')?.valid) completed++;
    if (this.chatbotForm.get('systemPrompt')?.valid) completed++;
    if (this.appearanceGroup.valid) completed++;
    return Math.round((completed / 3) * 100);
  }

  isStepCompleted(step: string): boolean {
    switch (step) {
      case 'General':
        return !!this.chatbotForm.get('name')?.valid;
      case 'AI Behaviour':
        return !!this.chatbotForm.get('systemPrompt')?.valid;
      case 'Appearance':
        return this.appearanceGroup.valid;
      default:
        return false;
    }
  }

  copyScript() {
    navigator.clipboard.writeText(this.generatedScript());
  }

  showEmbed(bot: BotListItem) {
    this.showEmbedForBot = bot;
  }

  closeEmbed() {
    this.showEmbedForBot = null;
  }

  copyEmbedScript(bot: BotListItem) {
    navigator.clipboard.writeText(this.getEmbedScript(bot));
  }

  getBotApiDetails(bot: BotListItem): { endpoint: string; method: string; body: string }[] {
    const id = bot.botId || bot.id;
    return [
      { endpoint: `POST ${UrlConstants.CHAT_API}${id}`, method: 'POST', body: JSON.stringify({ message: 'Hello', visitorId: 'USER_ID', sessionId: null }, null, 2) },
      { endpoint: `GET ${UrlConstants.GET_CONVERSATION_HISTORY}${id}`, method: 'GET', body: '' },
      { endpoint: `GET ${UrlConstants.GET_MESSAGE_BY_CONVERSATION_ID}{conversationId}`, method: 'GET', body: '' },
    ];
  }

  getStepIcon(stepName: string): string {
    const step = this.botFlowSteps.find(s => s.title === stepName);
    return step?.icon || 'bi bi-circle';
  }

  trackByBot(index: number, bot: BotListItem): any {
    return bot.botId || bot.id || index;
  }

  trackByStep(index: number): number {
    return index;
  }
}

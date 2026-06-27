import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BaseService } from '../../../../../../acore/base/base.service';
import { UrlConstants } from '../../../../../../acore/util/url';
import { SessionObject } from '../../../../../../acore/util/session-objects';
import { ConversationObj, Message, BotSelection } from './objects';

interface ApiEndpoint {
  method: string;
  path: string;
  description: string;
}


@Component({
  selector: 'app-chat-system',
  imports: [
    CommonModule,
    FormsModule,
  ],
  templateUrl: './chat-system.html',
  styleUrl: './chat-system.css',
})
export class ChatSystem {
  UrlConstants = UrlConstants;

  @ViewChild('chatBody') chatBody!: ElementRef;
  @ViewChild('scrollAnchor') scrollAnchor!: ElementRef;

  isMobile = window.innerWidth < 992;
  isNewChat = false;
  isTyping = false;
  newMessage = '';
  conversationList: ConversationObj[] = [];
  messages: Message[] = []
  bots: BotSelection[] = [];
  selectedBot: BotSelection | null = null;
  showApiDetails = false;
  origin = window.location.origin;

  selectedConversation: ConversationObj = {
    id: 0,
    sessionId: '',
    chatbotId: '',
    userId: '',
    visitorId: '',
    createdAt: ''
  };

  constructor(private service: BaseService) {
    this.fetchBots();
  }

  private loggedInUserId = SessionObject.getUserDetails().id || '';

  get embedScript(): string {
    if (!this.selectedBot) return '';
    const id = this.selectedBot.botId || this.selectedBot.id || '';
    return `<script src="${this.origin}/widget.js" data-bot-id="${id}" data-bot-name="${this.selectedBot.name}" data-user-id="${this.loggedInUserId}"></script>`;
  }

  get botEndpoints(): ApiEndpoint[] {
    if (!this.selectedBot) return [];
    const id = this.selectedBot.botId || this.selectedBot.id || '';
    return [
      { method: 'POST', path: UrlConstants.getChatScriptApi('{userId}', id), description: 'Send message via widget script' },
      { method: 'POST', path: `${UrlConstants.CHAT_API}${id}`, description: 'Send message (admin panel)' },
      { method: 'GET', path: `${UrlConstants.GET_CONVERSATION_HISTORY}${id}`, description: 'Get all conversations for this bot' },
      { method: 'GET', path: `${UrlConstants.GET_MESSAGE_BY_CONVERSATION_ID}{conversationId}`, description: 'Get messages in a conversation' },
    ];
  }

  toggleApiDetails() {
    this.showApiDetails = !this.showApiDetails;
  }

  copyEmbedScript() {
    navigator.clipboard.writeText(this.embedScript);
  }

  fetchBots() {
    this.service.getDataFromAPI(UrlConstants.GET_ALL_BOTS, 'json', true).subscribe({
      next: (res: BotSelection[]) => {
        this.bots = res;
        if (res.length > 0) {
          this.selectedBot = res[0];
          this.getConversationHistory();
        }
      },
      error: (err) => {
        console.log("Error while fetching bots ", err);
      }
    })
  }

  selectBot(bot: BotSelection) {
    if (this.selectedBot?.botId === bot.botId) return;
    this.selectedBot = bot;
    this.selectedConversation = {
      id: 0,
      sessionId: '',
      chatbotId: '',
      userId: '',
      visitorId: '',
      createdAt: ''
    };
    this.messages = [];
    this.isNewChat = false;
    this.getConversationHistory();
  }

  openChat(conversation: ConversationObj) {
    this.isNewChat = false;
    this.selectedConversation = conversation;
    this.getMessageByConversationId(conversation);
  }

  closeChat() {
    this.isNewChat = false;
    this.selectedConversation = {
      id: 0,
      sessionId: '',
      chatbotId: '',
      userId: '',
      visitorId: '',
      createdAt: ''
    };
  }

  newChat() {
    this.selectedConversation = {
      id: 0,
      sessionId: '',
      chatbotId: '',
      userId: '',
      visitorId: '',
      createdAt: ''
    };
    this.messages = [];
    this.isNewChat = true;
    this.scrollBottom();
  }

  sendMessage() {
    if (!this.newMessage.trim() || !this.selectedBot?.botId) return;

    const text = this.newMessage;
    this.newMessage = '';

    const optimisticMsg: Message = {
      id: 0,
      conversationId: this.selectedConversation.id,
      role: 'USER',
      content: text,
      timestamp: new Date().toISOString()
    };
    this.messages = [...this.messages, optimisticMsg];
    this.isNewChat = false;
    this.scrollBottom();

    let visitorId = localStorage.getItem('visitorId');
    if (!visitorId) {
      visitorId = crypto.randomUUID();
      localStorage.setItem('visitorId', visitorId);
    }

    const body = {
      message: text,
      visitorId: visitorId,
      sessionId: this.selectedConversation.sessionId || null
    }
    this.isTyping = true;
    this.service.postDataFromAPI(UrlConstants.CHAT_API + this.selectedBot.botId, body, 'json', true).subscribe({
      next: (res: any) => {
        this.isTyping = false;
        if (this.selectedConversation.id === 0) {
          this.getConversationHistory();
        }
        if (res?.conversationId || res?.id) {
          this.selectedConversation = { ...this.selectedConversation, id: res.conversationId || res.id };
        }
        this.getMessageByConversationId(this.selectedConversation);
      },
      error: (err) => {
        this.isTyping = false;
        console.log("Error while sending message to bot ", err);
      }
    })
  }

  getConversationHistory() {
    if (!this.selectedBot?.botId) return;
    this.service.getDataFromAPI(UrlConstants.GET_CONVERSATION_HISTORY + this.selectedBot.botId, 'json', true).subscribe({
      next: (res: ConversationObj[]) => {
        this.conversationList = res.sort((a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      },
      error: (err) => {
        console.log("Error while fetching conversation history ", err);
      }
    })
  }

  getMessageByConversationId(conversation: ConversationObj) {
    this.service.getDataFromAPI(UrlConstants.GET_MESSAGE_BY_CONVERSATION_ID + conversation.id, 'json', true).subscribe({
      next: (res: Message[]) => {
        this.messages = res.sort((a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
        this.scrollBottom();
      },
      error: (err) => {
        console.log("Error while fetching conversation history ", err);
      }
    })
  }

  formatTime(ts: string | null | undefined): string {
    if (!ts) return '';
    const date = new Date(ts);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const day = 86400000;

    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (diff < day && date.getDate() === now.getDate()) {
      return timeStr;
    }

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.getDate() === yesterday.getDate() &&
        date.getMonth() === yesterday.getMonth() &&
        date.getFullYear() === yesterday.getFullYear()) {
      return 'Yesterday ' + timeStr;
    }

    if (diff < 7 * day) {
      const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
      return days[date.getDay()] + ' ' + timeStr;
    }

    return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + timeStr;
  }

  scrollBottom() {
    setTimeout(() => {
      this.scrollAnchor?.nativeElement?.scrollIntoView({ behavior: 'instant', block: 'end' });
    });
  }

  @HostListener('window:resize')
  onResize() {
    this.isMobile = window.innerWidth < 992;
  }

}

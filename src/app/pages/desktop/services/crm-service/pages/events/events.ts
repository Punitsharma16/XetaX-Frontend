import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';


export interface Event {
  id?: string; // Optional for new events
  leadId: string;
  accountId: number;
  eventType: string;
  createBy: string;
  createAt: string;
  recordingUrl: string;
  message: string;
  updateBy: string;
  updateAt: string;
}

@Component({
  selector: 'app-events',
  imports: [FormsModule , CommonModule],
  templateUrl: './events.html',
  styleUrl: './events.css',
})
export class Events {
  @Input() leadId: string = '';
  @Input() events: Event[] = [];
  @Output() eventUpdated = new EventEmitter<Event>();

  showEventForm = false;
  selectedEvent: Event | null = null;
  eventModel: Partial<Event> = {};

  eventTypes = ['CALL', 'EMAIL', 'MEETING', 'NOTE', 'TASK', 'WHATSAPP'];

  users = [
      { id: 'user-uuid-123', name: 'John Doe' },
      { id: 'user-uuid-456', name: 'Jane Smith' },
      { id: 'user-uuid-789', name: 'Bob Johnson' }
  ];

  ngOnInit() {
      // Initialize with sample data if empty
      if (!this.events || this.events.length === 0) {
          this.loadSampleEvents();
      }
  }

  loadSampleEvents() {
      this.events = [
          {
              id: 'evt-001',
              leadId: this.leadId || 'lead-123',
              accountId: 101,
              eventType: 'CALL',
              createBy: 'user-uuid-123',
              createAt: new Date(Date.now() - 86400000).toISOString(), // Yesterday
              recordingUrl: 'https://example.com/recordings/call-001.mp3',
              message: 'Initial discussion about CRM requirements. Client interested in demo.',
              updateBy: 'user-uuid-123',
              updateAt: new Date(Date.now() - 86400000).toISOString()
          },
          {
              id: 'evt-002',
              leadId: this.leadId || 'lead-123',
              accountId: 101,
              eventType: 'EMAIL',
              createBy: 'user-uuid-456',
              createAt: new Date(Date.now() - 43200000).toISOString(), // 12 hours ago
              recordingUrl: '',
              message: 'Sent proposal document and pricing details.',
              updateBy: 'user-uuid-456',
              updateAt: new Date(Date.now() - 43200000).toISOString()
          },
          {
              id: 'evt-003',
              leadId: this.leadId || 'lead-123',
              accountId: 101,
              eventType: 'MEETING',
              createBy: 'user-uuid-123',
              createAt: new Date().toISOString(),
              recordingUrl: 'https://example.com/meetings/meet-001.mp4',
              message: 'Product demo scheduled for next week.',
              updateBy: 'user-uuid-123',
              updateAt: new Date().toISOString()
          }
      ];
  }

  addEvent() {
      this.selectedEvent = null;
      this.eventModel = {
          leadId: this.leadId,
          accountId: 101,
          eventType: 'CALL',
          message: '',
          recordingUrl: '',
          createBy: 'current-user',
          updateBy: 'current-user',
          createAt: new Date().toISOString(),
          updateAt: new Date().toISOString()
      };
      this.showEventForm = true;
  }

  editEvent(event: Event) {
      this.selectedEvent = event;
      this.eventModel = { ...event };
      this.showEventForm = true;
  }

  saveEvent() {
      if (this.selectedEvent) {
          // Update existing event
          const updatedEvent: Event = {
              ...this.selectedEvent,
              ...this.eventModel,
              updateAt: new Date().toISOString(),
              updateBy: 'current-user'
          } as Event;
          
          const index = this.events.findIndex(e => e.id === updatedEvent.id);
          if (index !== -1) {
              this.events[index] = updatedEvent;
          }
          this.eventUpdated.emit(updatedEvent);
      } else {
          // Create new event
          const newEvent: Event = {
              ...this.eventModel,
              id: this.generateEventId(),
              createAt: new Date().toISOString(),
              updateAt: new Date().toISOString(),
              leadId: this.leadId,
              createBy: 'current-user',
              updateBy: 'current-user'
          } as Event;
          
          this.events.unshift(newEvent); // Add to beginning for timeline
          this.eventUpdated.emit(newEvent);
      }
      
      this.closeEventForm();
  }

  deleteEvent(eventId: string | undefined) {
      if (!eventId) return;
      
      if (confirm('Are you sure you want to delete this event?')) {
          this.events = this.events.filter(e => e.id !== eventId);
          this.eventUpdated.emit({ id: eventId } as Event);
      }
  }

  closeEventForm() {
      this.showEventForm = false;
      this.selectedEvent = null;
      this.eventModel = {};
  }

  getUserName(userId: string): string {
      const user = this.users.find(u => u.id === userId);
      return user ? user.name : userId;
  }

  getEventIcon(eventType: string): string {
      const icons: { [key: string]: string } = {
          'CALL': 'bi-telephone',
          'EMAIL': 'bi-envelope',
          'MEETING': 'bi-calendar',
          'NOTE': 'bi-chat',
          'TASK': 'bi-check-circle',
          'WHATSAPP': 'bi-whatsapp'
      };
      return icons[eventType] || 'bi-clock-history';
  }

  getEventColor(eventType: string): string {
      const colors: { [key: string]: string } = {
          'CALL': 'primary',
          'EMAIL': 'info',
          'MEETING': 'success',
          'NOTE': 'warning',
          'TASK': 'secondary',
          'WHATSAPP': 'success'
      };
      return colors[eventType] || 'secondary';
  }

  formatEventTime(dateString: string): string {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins} minutes ago`;
      if (diffHours < 24) return `${diffHours} hours ago`;
      if (diffDays < 7) return `${diffDays} days ago`;
      
      return date.toLocaleDateString();
  }

  private generateEventId(): string {
      return 'evt-' + Math.random().toString(36).substr(2, 9);
  }
}

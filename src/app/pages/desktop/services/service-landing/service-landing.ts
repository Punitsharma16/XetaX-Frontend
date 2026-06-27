import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-service-landing',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './service-landing.html',
  styleUrls: ['./service-landing.css'],
})
export class ServiceLanding {
  services = [
    {
      key: 'account',
      title: 'Account Service',
      description: 'Manage accounts and users. Create, edit, and monitor all user accounts and permissions.',
      icon: 'bi-building',
      gradient: 'linear-gradient(135deg, #3b82f6, #2563eb)',
      color: '#3b82f6',
      lightBg: 'rgba(59, 130, 246, 0.1)',
      route: '/pages/account/accounts',
      features: ['User Management', 'Account Settings', 'Access Control'],
    },
    {
      key: 'chatbot',
      title: 'AI Bot',
      description: 'Build and deploy intelligent chatbots. Manage knowledge bases and chat with customers.',
      icon: 'bi-robot',
      gradient: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
      color: '#8b5cf6',
      lightBg: 'rgba(139, 92, 246, 0.1)',
      route: '/pages/chatbot/bots',
      features: ['Bot Builder', 'Knowledge Base', 'Chat System'],
    },
    {
      key: 'dining',
      title: 'Hotel & Restaurant',
      description: 'QR ordering and room service for hotels and restaurants. Manage menus, orders, and billing.',
      icon: 'bi-shop',
      gradient: 'linear-gradient(135deg, #f59e0b, #d97706)',
      color: '#f59e0b',
      lightBg: 'rgba(245, 158, 11, 0.1)',
      route: '/pages/dining',
      features: ['Menu Management', 'Order Processing', 'Room Service'],
    },
    {
      key: 'crm',
      title: 'CRM',
      description: 'Complete customer relationship management. Track leads, manage contacts, and close deals.',
      icon: 'bi-graph-up',
      gradient: 'linear-gradient(135deg, #10b981, #059669)',
      color: '#10b981',
      lightBg: 'rgba(16, 185, 129, 0.1)',
      route: '/pages/crm/lead',
      features: ['Lead Tracking', 'Contact Management', 'Pipeline Stages'],
    },
    {
      key: 'voice',
      title: 'AI Voice Bot',
      description: 'Voice-powered AI assistant. Upload audio for transcription, AI response generation, and text-to-speech playback.',
      icon: 'bi-mic',
      gradient: 'linear-gradient(135deg, #ec4899, #db2777)',
      color: '#ec4899',
      lightBg: 'rgba(236, 72, 153, 0.1)',
      route: '/pages/voice',
      features: ['Speech-to-Text', 'AI Response', 'Voice Playback'],
    },
  ];

  constructor(private router: Router) {}

  navigateTo(route: string): void {
    this.router.navigateByUrl(route);
  }
}

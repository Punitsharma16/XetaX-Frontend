import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet, NavigationEnd } from '@angular/router';
import { filter, Subscription } from 'rxjs';

interface SidebarItem {
  key: string;
  label: string;
  icon: string;
  route: string;
}

@Component({
  selector: 'app-sidebar',
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
})
export class Sidebar implements OnInit, OnDestroy {
  isCollapsed = false;
  isMobile = false;
  isMobileOpen = false;
  isServicePage = false;
  menu: SidebarItem[] = [];
  contextLabel = '';
  contextIcon = '';

  userName = '';
  userEmail = '';
  userInitials = '';

  private routerSub?: Subscription;

  private serviceMenus: Record<string, { label: string; icon: string; items: SidebarItem[] }> = {
    account: {
      label: 'Account Service',
      icon: 'bi-building',
      items: [
        { key: 'accounts', label: 'Accounts', icon: 'bi-building', route: '/pages/account/accounts' },
        { key: 'users', label: 'Users', icon: 'bi-people', route: '/pages/account/users' },
      ],
    },
    chatbot: {
      label: 'AI Bot',
      icon: 'bi-robot',
      items: [
        { key: 'bots', label: 'My Bots', icon: 'bi-robot', route: '/pages/chatbot/bots' },
        { key: 'chat', label: 'Chat System', icon: 'bi-chat', route: '/pages/chatbot/chat' },
      ],
    },
    crm: {
      label: 'CRM',
      icon: 'bi-graph-up',
      items: [
        { key: 'lead', label: 'Leads', icon: 'bi-person-lines-fill', route: '/pages/crm/lead' },
        { key: 'contact', label: 'Contacts', icon: 'bi-book', route: '/pages/crm/contact' },
        { key: 'task', label: 'Tasks', icon: 'bi-check2-square', route: '/pages/crm/task' },
        { key: 'sources', label: 'Sources', icon: 'bi-diagram-3', route: '/pages/crm/sources' },
        { key: 'stages', label: 'Stages', icon: 'bi-layers', route: '/pages/crm/stages' },
        { key: 'field', label: 'Fields', icon: 'bi-input-cursor-text', route: '/pages/crm/field' },
        { key: 'events', label: 'Events', icon: 'bi-calendar-event', route: '/pages/crm/events' },
        { key: 'documents', label: 'Documents', icon: 'bi-folder', route: '/pages/crm/documents' },
      ],
    },
    dining: {
      label: 'Restaurant & Hotel',
      icon: 'bi-shop',
      items: [
        { key: 'service', label: 'Dining Entry', icon: 'bi-qr-code', route: '/pages/dining' },
        { key: 'tables', label: 'Tables & Rooms', icon: 'bi-table', route: '/pages/dining/tables' },
        { key: 'orders', label: 'Orders', icon: 'bi-receipt', route: '/pages/dining/orders' },
        { key: 'menu', label: 'Menu Management', icon: 'bi-menu-app', route: '/pages/dining/menu' },
        { key: 'history', label: 'User History', icon: 'bi-clock-history', route: '/pages/dining/history' },
      ],
    },
    voice: {
      label: 'AI Voice Bot',
      icon: 'bi-mic',
      items: [
        { key: 'voice-input', label: 'Voice Input', icon: 'bi-mic', route: '/pages/voice' },
      ],
    },
  };

  constructor(private router: Router) {
    this.checkScreen();
    this.loadUser();
  }

  ngOnInit(): void {
    this.routerSub = this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => this.updateContext());
    this.updateContext();
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
  }

  private updateContext(): void {
    const url = this.router.url;

    if (url === '/pages' || url === '/pages/') {
      this.isServicePage = false;
      this.menu = [];
      this.contextLabel = '';
      this.contextIcon = '';
      return;
    }

    this.isServicePage = true;

    const firstSegment = url.split('/')[2]?.split('?')[0] || '';

    const service = this.serviceMenus[firstSegment];
    if (service) {
      this.menu = [
        { key: 'back', label: 'All Services', icon: 'bi-grid', route: '/pages' },
        ...service.items,
      ];
      this.contextLabel = service.label;
      this.contextIcon = service.icon;
    } else {
      this.menu = [
        { key: 'back', label: 'All Services', icon: 'bi-grid', route: '/pages' },
      ];
      this.contextLabel = '';
      this.contextIcon = '';
    }
  }

  loadUser() {
    const raw = localStorage.getItem('user_info');
    if (raw) {
      try {
        const user = JSON.parse(raw);
        const name = user.name || user.email || '';
        this.userName = name;
        this.userEmail = user.email || '';
        const parts = name.split(' ').filter((s: string) => s.length > 0);
        if (parts.length >= 2) {
          this.userInitials = (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        } else {
          this.userInitials = name.substring(0, 2).toUpperCase();
        }
      } catch {}
    }
  }

  @HostListener('window:resize')
  checkScreen() {
    this.isMobile = window.innerWidth < 992;
    if (!this.isMobile) {
      this.isMobileOpen = false;
    }
  }

  toggleCollapse() {
    if (!this.isMobile) {
      this.isCollapsed = !this.isCollapsed;
    }
  }

  goToProfile() {
    this.router.navigate(['/pages/profile']);
    this.closeMobile();
  }

  toggleMobile() {
    this.isMobileOpen = !this.isMobileOpen;
  }

  closeMobile() {
    this.isMobileOpen = false;
  }

  logout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_info');
    this.router.navigate(['/']);
  }
}

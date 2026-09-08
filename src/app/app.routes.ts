import { Routes } from '@angular/router';

import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';

/**
 * Every feature is lazy-loaded, so a signed-out visitor downloads nothing but
 * the login chunk.
 *
 * No route is role-gated: the auth service never grants roles and no backend
 * endpoint checks one, so gating here only hid pages users may open. roleGuard
 * is still available — add `canActivate: [roleGuard], data: { roles: [...] }`
 * once real roles exist (see layout/navigation.ts).
 *
 * Route params reach components as inputs via withComponentInputBinding().
 */
export const routes: Routes = [
  {
    path: 'login',
    title: 'Sign in · XetaX CRM',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/login/login.component').then((m) => m.LoginComponent),
  },

  {
    path: 'register',
    title: 'Create your account · XetaX CRM',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/register/register.component').then((m) => m.RegisterComponent),
  },

  {
    path: 'verify-email',
    title: 'Confirm your email · XetaX CRM',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/verify-email/verify-email.component').then((m) => m.VerifyEmailComponent),
  },

  // Google sign-in lands here with tokens in the URL fragment.
  {
    path: 'oauth/callback',
    title: 'Signing you in · XetaX CRM',
    loadComponent: () =>
      import('./features/auth/oauth-callback/oauth-callback.component').then(
        (m) => m.OAuthCallbackComponent,
      ),
  },

  {
    path: 'forgot-password',
    title: 'Reset your password · XetaX CRM',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/forgot-password/forgot-password.component').then(
        (m) => m.ForgotPasswordComponent,
      ),
  },

  {
    path: 'app',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/shell/shell.component').then((m) => m.ShellComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },

      {
        path: 'dashboard',
        title: 'Dashboard · XetaX CRM',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },

      // ---- First-run setup wizard (also reachable from the user menu) ----
      {
        path: 'onboarding',
        title: 'Setup guide · XetaX CRM',
        loadComponent: () =>
          import('./features/onboarding/onboarding.component').then((m) => m.OnboardingComponent),
      },

      // ---- AI Assistant ----
      {
        path: 'ai',
        title: 'AI Assistant · XetaX CRM',
        loadComponent: () =>
          import('./features/ai/ai-workspace/ai-workspace.component').then(
            (m) => m.AiWorkspaceComponent,
          ),
      },

      // ---- Forms, fields and stages ----
      {
        path: 'forms',
        title: 'Forms · XetaX CRM',
        loadComponent: () =>
          import('./features/forms/forms-list/forms-list.component').then(
            (m) => m.FormsListComponent,
          ),
      },
      {
        path: 'forms/:id',
        title: 'Form configuration · XetaX CRM',
        loadComponent: () =>
          import('./features/forms/form-detail/form-detail.component').then(
            (m) => m.FormDetailComponent,
          ),
      },

      // ---- Records ----
      {
        path: 'records',
        title: 'Records · XetaX CRM',
        loadComponent: () =>
          import('./features/records/records-list/records-list.component').then(
            (m) => m.RecordsListComponent,
          ),
      },
      {
        path: 'records/:slug',
        title: 'Records · XetaX CRM',
        loadComponent: () =>
          import('./features/records/records-list/records-list.component').then(
            (m) => m.RecordsListComponent,
          ),
      },
      {
        path: 'records/:slug/:recordId',
        title: 'Record · XetaX CRM',
        loadComponent: () =>
          import('./features/records/record-detail/record-detail.component').then(
            (m) => m.RecordDetailComponent,
          ),
      },

      // ---- Search ----
      {
        path: 'search',
        title: 'Advanced search · XetaX CRM',
        loadComponent: () =>
          import('./features/search/search.component').then((m) => m.SearchComponent),
      },

      // ---- Automations ----
      {
        path: 'automations',
        title: 'Automations · XetaX CRM',
        loadComponent: () =>
          import('./features/automations/automations-list/automations-list.component').then(
            (m) => m.AutomationsListComponent,
          ),
      },
      {
        path: 'automations/:id',
        title: 'Automation rules · XetaX CRM',
        loadComponent: () =>
          import('./features/automations/automation-detail/automation-detail.component').then(
            (m) => m.AutomationDetailComponent,
          ),
      },

      // ---- AI Agents ----
      {
        path: 'agents',
        title: 'AI Agents · XetaX CRM',
        loadComponent: () =>
          import('./features/agents/agents-list/agents-list.component').then(
            (m) => m.AgentsListComponent,
          ),
      },
      {
        path: 'agents/:id',
        title: 'AI Agent · XetaX CRM',
        loadComponent: () =>
          import('./features/agents/agent-detail/agent-detail.component').then(
            (m) => m.AgentDetailComponent,
          ),
      },

      // ---- Tasks ----
      {
        path: 'tasks',
        title: 'Tasks · XetaX CRM',
        loadComponent: () =>
          import('./features/tasks/tasks-page.component').then((m) => m.TasksPageComponent),
      },

      // ---- Documents ----
      {
        path: 'documents',
        title: 'Documents · XetaX CRM',
        loadComponent: () =>
          import('./features/documents/documents-page.component').then((m) => m.DocumentsPageComponent),
      },

      // ---- Invoices ----
      {
        path: 'invoices',
        title: 'Invoices · XetaX CRM',
        loadComponent: () =>
          import('./features/invoices/invoices-list/invoices-list.component').then(
            (m) => m.InvoicesListComponent,
          ),
      },
      {
        path: 'invoices/:id',
        title: 'Invoice · XetaX CRM',
        loadComponent: () =>
          import('./features/invoices/invoice-detail/invoice-detail.component').then(
            (m) => m.InvoiceDetailComponent,
          ),
      },

      // ---- Contacts ----
      {
        path: 'contacts',
        title: 'Contacts · XetaX CRM',
        loadComponent: () =>
          import('./features/contacts/contacts-list/contacts-list.component').then(
            (m) => m.ContactsListComponent,
          ),
      },
      {
        path: 'contacts/:id',
        title: 'Contact · XetaX CRM',
        loadComponent: () =>
          import('./features/contacts/contact-detail/contact-detail.component').then(
            (m) => m.ContactDetailComponent,
          ),
      },

      // ---- Meetings ----
      {
        path: 'meetings',
        title: 'Meetings · XetaX CRM',
        loadComponent: () =>
          import('./features/meetings/meetings-list/meetings-list.component').then(
            (m) => m.MeetingsListComponent,
          ),
      },

      // ---- WhatsApp ----
      {
        path: 'whatsapp',
        title: 'WhatsApp · XetaX CRM',
        loadComponent: () =>
          import('./features/whatsapp/settings/whatsapp-settings.component').then(
            (m) => m.WhatsAppSettingsComponent,
          ),
      },
      {
        path: 'whatsapp/conversations',
        title: 'WhatsApp conversations · XetaX CRM',
        loadComponent: () =>
          import('./features/whatsapp/conversations/whatsapp-conversations.component').then(
            (m) => m.WhatsAppConversationsComponent,
          ),
      },
      {
        path: 'whatsapp/campaigns',
        title: 'WhatsApp campaigns · XetaX CRM',
        loadComponent: () =>
          import('./features/whatsapp/campaigns/campaigns-list.component').then(
            (m) => m.WhatsAppCampaignsListComponent,
          ),
      },
      {
        path: 'whatsapp/campaigns/new',
        title: 'New WhatsApp campaign · XetaX CRM',
        loadComponent: () =>
          import('./features/whatsapp/campaigns/campaign-create.component').then(
            (m) => m.WhatsAppCampaignCreateComponent,
          ),
      },
      {
        path: 'whatsapp/campaigns/:id',
        title: 'WhatsApp campaign · XetaX CRM',
        loadComponent: () =>
          import('./features/whatsapp/campaigns/campaign-detail.component').then(
            (m) => m.WhatsAppCampaignDetailComponent,
          ),
      },

      // ---- AI Agents ----
      {
        path: 'agents',
        title: 'AI Agents · XetaX CRM',
        loadComponent: () =>
          import('./features/agents/agents-list/agents-list.component').then(
            (m) => m.AgentsListComponent,
          ),
      },
      {
        path: 'agents/:id',
        title: 'AI Agent · XetaX CRM',
        loadComponent: () =>
          import('./features/agents/agent-detail/agent-detail.component').then(
            (m) => m.AgentDetailComponent,
          ),
      },

      // ---- Meetings ----
      {
        path: 'meetings',
        title: 'Meetings · XetaX CRM',
        loadComponent: () =>
          import('./features/meetings/meetings-list/meetings-list.component').then(
            (m) => m.MeetingsListComponent,
          ),
      },

      // ---- WhatsApp ----
      {
        path: 'whatsapp',
        title: 'WhatsApp · XetaX CRM',
        loadComponent: () =>
          import('./features/whatsapp/settings/whatsapp-settings.component').then(
            (m) => m.WhatsAppSettingsComponent,
          ),
      },
      {
        path: 'whatsapp/conversations',
        title: 'WhatsApp conversations · XetaX CRM',
        loadComponent: () =>
          import('./features/whatsapp/conversations/whatsapp-conversations.component').then(
            (m) => m.WhatsAppConversationsComponent,
          ),
      },
      {
        path: 'whatsapp/campaigns',
        title: 'WhatsApp campaigns · XetaX CRM',
        loadComponent: () =>
          import('./features/whatsapp/campaigns/campaigns-list.component').then(
            (m) => m.WhatsAppCampaignsListComponent,
          ),
      },
      {
        path: 'whatsapp/campaigns/new',
        title: 'New WhatsApp campaign · XetaX CRM',
        loadComponent: () =>
          import('./features/whatsapp/campaigns/campaign-create.component').then(
            (m) => m.WhatsAppCampaignCreateComponent,
          ),
      },
      {
        path: 'whatsapp/campaigns/:id',
        title: 'WhatsApp campaign · XetaX CRM',
        loadComponent: () =>
          import('./features/whatsapp/campaigns/campaign-detail.component').then(
            (m) => m.WhatsAppCampaignDetailComponent,
          ),
      },

      // ---- Integrations ----
      {
        path: 'integrations',
        title: 'Integrations · XetaX CRM',
        loadComponent: () =>
          import('./features/integrations/integrations-list/integrations-list.component').then(
            (m) => m.IntegrationsListComponent,
          ),
      },

      // ---- Users & own profile ----
      {
        path: 'users',
        title: 'Users · XetaX CRM',
        loadComponent: () =>
          import('./features/users/users-list/users-list.component').then(
            (m) => m.UsersListComponent,
          ),
      },
      {
        path: 'profile',
        title: 'My profile · XetaX CRM',
        loadComponent: () =>
          import('./features/users/profile/profile.component').then((m) => m.ProfileComponent),
      },

      {
        path: 'unauthorized',
        title: 'Access denied · XetaX CRM',
        loadComponent: () =>
          import('./features/errors/unauthorized.component').then((m) => m.UnauthorizedComponent),
      },

      {
        path: '**',
        loadComponent: () =>
          import('./features/errors/not-found.component').then((m) => m.NotFoundComponent),
      },
    ],
  },

  {
    path: 'unauthorized',
    title: 'Access denied · XetaX CRM',
    loadComponent: () =>
      import('./features/errors/unauthorized.component').then((m) => m.UnauthorizedComponent),
  },

  // Public meeting room — guests join via shared link, no auth.
  {
    path: 'meet/:code',
    title: 'Meeting · XetaX',
    loadComponent: () =>
      import('./features/meetings/meeting-room/meeting-room.component').then(
        (m) => m.MeetingRoomComponent,
      ),
  },

  // Hosted chat link — share it in campaigns; opens the agent chat directly.
  {
    path: 'chat/:key',
    title: 'Chat · XetaX',
    loadComponent: () =>
      import('./features/agents/public-chat/public-chat.component').then((m) => m.PublicChatComponent),
  },

  {
    path: 'f/:key',
    title: 'Form · XetaX',
    loadComponent: () =>
      import('./features/publicform/public-form.component').then((m) => m.PublicFormComponent),
  },

  { path: '', pathMatch: 'full', redirectTo: 'app/dashboard' },
  { path: '**', redirectTo: 'app/dashboard' },
];

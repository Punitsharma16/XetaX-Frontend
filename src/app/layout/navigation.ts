export interface NavItem {
  label: string;
  icon: string;
  route: string;
  /** Empty means every signed-in user sees it. Admins always pass. */
  roles?: string[];
  /** Permission key from the backend catalog — hidden when the role lacks it. */
  perm?: string;
  /** Rendered as a small trailing pill (e.g. "Beta"). */
  badge?: string;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

/**
 * Sidebar definition.
 *
 * The backend has no menu endpoint, so navigation is declared here and filtered
 * by role at render time, mirroring the `roles` metadata on the routes.
 *
 * Nothing is role-gated today, and that is deliberate: the auth service never
 * grants roles (AuthUserEntity has no roles field and createUser saves a user
 * without one, so `roles` always comes back empty), and neither the gateway nor
 * the CRM service checks a role on any endpoint. Gating on ADMIN therefore hid
 * pages that every authenticated user is in fact allowed to open.
 *
 * When real roles exist, restore a restriction by adding `roles: [AppRole.Admin]`
 * here and `canActivate: [roleGuard], data: { roles: [...] }` on the matching
 * route — both mechanisms are still wired up.
 */
export const NAVIGATION: NavSection[] = [
  {
    title: 'Overview',
    items: [
      { label: 'Dashboard', icon: 'bi-grid-1x2', route: '/app/dashboard' },
      { label: 'AI Assistant', icon: 'bi-stars', route: '/app/ai', badge: 'AI', perm: 'ai.use' },
      { label: 'Tasks', icon: 'bi-check2-square', route: '/app/tasks' },
    ],
  },
  {
    title: 'Data Manager',
    items: [
      { label: 'Forms', icon: 'bi-ui-checks-grid', route: '/app/forms', perm: 'forms.view' },
      { label: 'Records', icon: 'bi-collection', route: '/app/records', perm: 'records.view|records.view.own' },
      { label: 'Advanced Search', icon: 'bi-search', route: '/app/search', perm: 'records.view|records.view.own' },
      { label: 'Documents', icon: 'bi-folder2-open', route: '/app/documents', perm: 'documents.view' },
      { label: 'Invoices', icon: 'bi-receipt', route: '/app/invoices', perm: 'invoices.view' },
    ],
  },
  {
    title: 'Engagement',
    items: [
      { label: 'Contacts', icon: 'bi-person-lines-fill', route: '/app/contacts', perm: 'contacts.view' },
      { label: 'WhatsApp', icon: 'bi-whatsapp', route: '/app/whatsapp', perm: 'whatsapp.view' },
      { label: 'Meetings', icon: 'bi-camera-video', route: '/app/meetings', perm: 'meetings.view' },
      { label: 'AI Agents', icon: 'bi-robot', route: '/app/agents', perm: 'agents.manage' },
    ],
  },
  {
    title: 'Configuration',
    items: [
      { label: 'Automations', icon: 'bi-lightning-charge', route: '/app/automations', perm: 'automations.view' },
      { label: 'Integrations', icon: 'bi-plug', route: '/app/integrations', perm: 'integrations.view' },
      { label: 'Team', icon: 'bi-people', route: '/app/users', perm: 'team.manage' },
    ],
  },
];

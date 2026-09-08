import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ConfirmService } from '../../../core/services/confirm.service';
import { PermissionService } from '../../../core/services/permission.service';
import { ToastService } from '../../../core/services/toast.service';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import {
  EmptyStateComponent,
  ErrorStateComponent,
  TableSkeletonComponent,
} from '../../../shared/components/state/state-views.component';
import { OrgRole, PermissionInfo, TeamMember, TeamService } from '../team.service';

/**
 * Team management: members (create with a role, change role, remove) and
 * custom roles (admin picks exactly which permissions each role allows —
 * the checkboxes render straight from the backend's permission catalog).
 */
@Component({
  selector: 'app-users-list',
  standalone: true,
  imports: [
    FormsModule,
    ModalComponent,
    PageHeaderComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    TableSkeletonComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './users-list.component.html',
  styleUrl: './users-list.component.css',
})
export class UsersListComponent {
  private readonly team = inject(TeamService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  readonly perms = inject(PermissionService);

  readonly tab = signal<'members' | 'roles'>('members');
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly members = signal<TeamMember[]>([]);
  readonly roles = signal<OrgRole[]>([]);
  readonly catalog = signal<Record<string, PermissionInfo[]>>({});

  readonly catalogGroups = computed(() => Object.keys(this.catalog()));
  readonly assignableRoles = computed(() => this.roles());

  /* member modal */
  readonly memberOpen = signal(false);
  readonly savingMember = signal(false);
  mName = '';
  mEmail = '';
  mPassword = '';
  mRoleId: number | null = null;

  /* role modal (create/edit) */
  readonly roleOpen = signal(false);
  readonly savingRole = signal(false);
  editingRole: OrgRole | null = null;
  rName = '';
  rPerms = new Set<string>();

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    this.team.roles().subscribe({
      next: (roles) => {
        this.roles.set(roles);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set(true);
      },
    });
    this.team.members().subscribe({ next: (members) => this.members.set(members) });
    this.team.permissionCatalog().subscribe({ next: (catalog) => this.catalog.set(catalog) });
  }

  /* ------------------------------------------------------------ members */

  openMemberModal(): void {
    this.mName = this.mEmail = this.mPassword = '';
    const firstCustom = this.roles().find((role) => !role.system);
    this.mRoleId = (firstCustom ?? this.roles()[0])?.id ?? null;
    this.memberOpen.set(true);
  }

  createMember(): void {
    if (!this.mName.trim() || !this.mEmail.trim() || this.mPassword.length < 6 || !this.mRoleId) {
      this.toast.warning(
        'Details incomplete',
        'Name, email, a 6+ character password and a role are all required.',
      );
      return;
    }
    this.savingMember.set(true);
    this.team
      .createMember(this.mName.trim(), this.mEmail.trim(), this.mPassword, this.mRoleId)
      .subscribe({
        next: (member) => {
          this.savingMember.set(false);
          this.memberOpen.set(false);
          this.members.update((list) => [...list, member]);
          this.toast.success('Member created', `${member.name} → ${member.roleName}`);
          this.load();
        },
        error: () => this.savingMember.set(false),
      });
  }

  changeRole(member: TeamMember, roleId: string): void {
    const parsed = Number(roleId);
    if (!parsed || parsed === member.roleId) return;
    this.team.changeRole(member.userId, parsed).subscribe({
      next: () => {
        this.toast.success('Role changed', member.name);
        this.load();
      },
    });
  }

  removeMember(member: TeamMember): void {
    this.confirm
      .ask({
        title: `Remove ${member.name}?`,
        message: 'The member loses access to this organisation (the account itself is not deleted).',
        confirmText: 'Remove',
        variant: 'danger',
      })
      .subscribe((ok) => {
        if (!ok) return;
        this.team.removeMember(member.userId).subscribe({
          next: () => {
            this.members.update((list) => list.filter((m) => m.userId !== member.userId));
            this.toast.success('Member removed', member.name);
          },
        });
      });
  }

  /* -------------------------------------------------------------- roles */

  openRoleModal(role: OrgRole | null): void {
    this.editingRole = role;
    this.rName = role?.name ?? '';
    this.rPerms = new Set(role?.permissions ?? []);
    this.roleOpen.set(true);
  }

  togglePerm(key: string): void {
    if (this.rPerms.has(key)) this.rPerms.delete(key);
    else this.rPerms.add(key);
    this.rPerms = new Set(this.rPerms);
  }

  toggleGroup(group: string): void {
    const keys = (this.catalog()[group] ?? []).map((p) => p.key);
    const allOn = keys.every((k) => this.rPerms.has(k));
    keys.forEach((k) => (allOn ? this.rPerms.delete(k) : this.rPerms.add(k)));
    this.rPerms = new Set(this.rPerms);
  }

  groupState(group: string): 'all' | 'some' | 'none' {
    const keys = (this.catalog()[group] ?? []).map((p) => p.key);
    const on = keys.filter((k) => this.rPerms.has(k)).length;
    return on === 0 ? 'none' : on === keys.length ? 'all' : 'some';
  }

  saveRole(): void {
    if (!this.rName.trim()) {
      this.toast.warning('Name missing', 'Role ka naam do (e.g. SALES AGENT).');
      return;
    }
    this.savingRole.set(true);
    const permissions = [...this.rPerms];
    const request = this.editingRole
      ? this.team.updateRole(this.editingRole.id, this.rName.trim(), permissions)
      : this.team.createRole(this.rName.trim(), permissions);
    request.subscribe({
      next: (role) => {
        this.savingRole.set(false);
        this.roleOpen.set(false);
        this.toast.success(this.editingRole ? 'Role updated' : 'Role created', role.name);
        this.load();
      },
      error: () => this.savingRole.set(false),
    });
  }

  deleteRole(role: OrgRole): void {
    this.confirm.confirmDelete(`role '${role.name}'`).subscribe((ok) => {
      if (!ok) return;
      this.team.deleteRole(role.id).subscribe({
        next: () => {
          this.toast.success('Role deleted', role.name);
          this.load();
        },
      });
    });
  }

  permCount(role: OrgRole): string {
    return role.system ? 'All permissions' : `${role.permissions.length} permissions`;
  }
}

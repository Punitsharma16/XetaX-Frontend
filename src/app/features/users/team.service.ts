import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { CrmApiService } from '../../core/services/crm-api.service';

export interface OrgRole {
  id: number;
  name: string;
  system: boolean;
  permissions: string[];
  memberCount: number;
}

export interface TeamMember {
  userId: string;
  name: string;
  email: string;
  roleId: number | null;
  roleName: string;
}

export interface PermissionInfo {
  key: string;
  label: string;
}

/** Team management API — roles + members of the signed-in owner's org. */
@Injectable({ providedIn: 'root' })
export class TeamService {
  private readonly api = inject(CrmApiService);
  private readonly path = '/api/team';

  permissionCatalog(): Observable<Record<string, PermissionInfo[]>> {
    return this.api.get<Record<string, PermissionInfo[]>>(`${this.path}/permissions`);
  }

  roles(): Observable<OrgRole[]> {
    return this.api.get<OrgRole[]>(`${this.path}/roles`);
  }

  createRole(name: string, permissions: string[]): Observable<OrgRole> {
    return this.api.post<OrgRole>(`${this.path}/roles`, { name, permissions });
  }

  updateRole(id: number, name: string, permissions: string[]): Observable<OrgRole> {
    return this.api.put<OrgRole>(`${this.path}/roles/${id}`, { name, permissions });
  }

  deleteRole(id: number): Observable<string> {
    return this.api.delete(`${this.path}/roles/${id}`);
  }

  /** Owner + members (id/name) — transfer dropdown; needs records.transfer only. */
  assignees(): Observable<{ userId: string; name: string }[]> {
    return this.api.get<{ userId: string; name: string }[]>(`${this.path}/assignees`, undefined, {
      quiet: true,
    });
  }

  members(): Observable<TeamMember[]> {
    return this.api.get<TeamMember[]>(`${this.path}/members`);
  }

  /** quiet variant for pages (records transfer) where team info is optional. */
  membersQuiet(): Observable<TeamMember[]> {
    return this.api.get<TeamMember[]>(`${this.path}/members`, undefined, { quiet: true });
  }

  createMember(name: string, email: string, password: string, roleId: number): Observable<TeamMember> {
    return this.api.post<TeamMember>(`${this.path}/members`, { name, email, password, roleId });
  }

  changeRole(userId: string, roleId: number): Observable<string> {
    return this.api.put(`${this.path}/members/${userId}/role`, { roleId }) as Observable<string>;
  }

  removeMember(userId: string): Observable<string> {
    return this.api.delete(`${this.path}/members/${userId}`);
  }
}

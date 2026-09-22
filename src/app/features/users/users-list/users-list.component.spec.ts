import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { UsersListComponent } from './users-list.component';

/**
 * The Team page has to say who can do what. Its role column is read as the
 * truth about a person's access, so showing the wrong role is worse than
 * showing none — an owner would believe someone is an admin when they are not.
 */
describe('UsersListComponent', () => {
  let fixture: ComponentFixture<UsersListComponent>;
  let component: UsersListComponent;

  const roles = [
    { id: 1, name: 'ADMIN', system: true, permissions: [] },
    { id: 3, name: 'TEST_SALES_AGENT', system: false, permissions: ['records.view'] },
  ];

  const members = [
    { userId: 'a', name: 'TEST Sneha', email: 'sneha@x.com', roleId: 3, roleName: 'TEST_SALES_AGENT' },
    { userId: 'b', name: 'TEST Rahul', email: 'rahul@x.com', roleId: 1, roleName: 'ADMIN' },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UsersListComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(UsersListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    // Whatever the page asked for on load, answer it with this workspace.
    const http = TestBed.inject(HttpTestingController);
    for (const request of http.match(() => true)) {
      const url = request.request.url;
      if (url.includes('/members')) request.flush({ data: members });
      else if (url.includes('/roles')) request.flush({ data: roles });
      else if (url.includes('/permissions')) request.flush({ data: { Records: [] } });
      else request.flush({ data: [] });
    }
    component.members.set(members as never);
    component.roles.set(roles as never);
    fixture.detectChanges();
  });

  /** The role pickers in the member rows, in order. */
  const rowSelects = (): HTMLSelectElement[] =>
    Array.from(fixture.nativeElement.querySelectorAll('tbody select'));

  it('shows each member on their own role, not the first one in the list', () => {
    const selected = rowSelects().map((select) => select.options[select.selectedIndex]?.textContent?.trim());

    expect(selected).toEqual(['TEST_SALES_AGENT', 'ADMIN']);
  });

  it('offers every role in each row', () => {
    const options = rowSelects()[0].options;

    expect(Array.from(options).map((o) => o.textContent?.trim())).toEqual(['ADMIN', 'TEST_SALES_AGENT']);
  });
});

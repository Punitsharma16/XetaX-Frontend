import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ShowAlert } from './show-alert';

describe('ShowAlert', () => {
  let component: ShowAlert;
  let fixture: ComponentFixture<ShowAlert>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ShowAlert]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ShowAlert);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

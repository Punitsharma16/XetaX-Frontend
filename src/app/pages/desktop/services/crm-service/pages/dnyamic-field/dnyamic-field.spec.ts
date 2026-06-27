import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DnyamicField } from './dnyamic-field';

describe('DnyamicField', () => {
  let component: DnyamicField;
  let fixture: ComponentFixture<DnyamicField>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DnyamicField]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DnyamicField);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

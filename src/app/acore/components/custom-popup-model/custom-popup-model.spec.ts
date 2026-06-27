import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CustomPopupModel } from './custom-popup-model';

describe('CustomPopupModel', () => {
  let component: CustomPopupModel;
  let fixture: ComponentFixture<CustomPopupModel>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CustomPopupModel]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CustomPopupModel);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

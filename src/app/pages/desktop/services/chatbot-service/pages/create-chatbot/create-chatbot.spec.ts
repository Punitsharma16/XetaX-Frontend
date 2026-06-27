import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreateChatbot } from './create-chatbot';

describe('CreateChatbot', () => {
  let component: CreateChatbot;
  let fixture: ComponentFixture<CreateChatbot>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateChatbot]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CreateChatbot);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

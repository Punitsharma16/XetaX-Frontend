import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';

import { ChatSystem } from './chat-system';

describe('ChatSystem', () => {
  let component: ChatSystem;
  let fixture: ComponentFixture<ChatSystem>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChatSystem],
      providers: [provideHttpClient()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ChatSystem);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

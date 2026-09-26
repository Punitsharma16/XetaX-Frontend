import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { AiChatService } from '../ai-chat.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { AiWorkspaceComponent } from './ai-workspace.component';

/**
 * The answer arrived, the bubble appeared, and the bubble was empty — the
 * text only showed up after a page reload.
 *
 * The AI bubble renders [innerHTML]="message.html", and html is only ever
 * built when a message is first pushed. The streaming path pushes an EMPTY
 * bubble and then updates text as tokens arrive, so html stayed as the
 * rendering of "" for the whole answer. A reload rebuilt html from the
 * persisted text, which is why refreshing "fixed" it.
 */
describe('the assistant bubble while the answer is streaming', () => {

  let fixture: ComponentFixture<AiWorkspaceComponent>;
  let component: AiWorkspaceComponent;
  let tokens: string[];

  const render = async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [AiWorkspaceComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: AiChatService,
          useValue: {
            chatStream: async (_m: string, _c: string, onToken: (t: string) => void) => {
              tokens.forEach((t) => onToken(t));
            },
            chat: () => of({ response: 'fallback' }),
          },
        },
        { provide: ConfirmService, useValue: { ask: () => of(true) } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(AiWorkspaceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  const bubbleText = (): string => {
    const bubbles = fixture.nativeElement.querySelectorAll('.ai-msg--ai .ai-msg__bubble');
    return bubbles.length ? (bubbles[bubbles.length - 1] as HTMLElement).textContent!.trim() : '';
  };

  const sendAndSettle = async (text: string) => {
    component.send(text);
    await fixture.whenStable();
    fixture.detectChanges();
  };

  it('shows the answer without needing a reload', async () => {
    tokens = ['You have 3 open leads.'];
    await render();

    await sendAndSettle('mere leads dikhao');

    expect(bubbleText()).toContain('You have 3 open leads.');
  });

  it('keeps the bubble in step with the text as more arrives', async () => {
    // A real stream lands in pieces; every piece has to reach the screen, not
    // just the first one.
    tokens = ['You have ', '3 open ', 'leads.'];
    await render();

    await sendAndSettle('mere leads dikhao');

    expect(bubbleText()).toContain('You have 3 open leads.');
  });

  it('renders the answer as markdown, the way a reloaded one is rendered', async () => {
    tokens = ['Your forms:\n\n- Leads\n- Support'];
    await render();

    await sendAndSettle('mere forms dikhao');

    const bubble = fixture.nativeElement.querySelector('.ai-msg--ai .ai-msg__bubble');
    expect(bubble.querySelectorAll('li').length)
      .withContext('a streamed answer should format like a reloaded one')
      .toBe(2);
  });

  it('still shows what it received when the stream dies mid-answer', async () => {
    await render();
    (TestBed.inject(AiChatService) as unknown as {
      chatStream: (m: string, c: string, onToken: (t: string) => void) => Promise<void>;
    }).chatStream = async (_m, _c, onToken) => {
      onToken('You have 3 open');
      throw new Error('stream failed: 500');
    };

    await sendAndSettle('mere leads dikhao');

    expect(bubbleText()).toContain('You have 3 open');
  });
});

import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

import { AuthService } from '../../../core/authentication/auth.service';
import { MeetingService } from '../meeting.service';
import { MeetingRoomComponent } from './meeting-room.component';

/**
 * Who is heard, and who is seen.
 *
 * <p>Three things went wrong together in a call: nobody saw their own face,
 * everyone heard themselves, and nobody heard anyone else. All three came down
 * to how a stream reaches a tile — the local tile has to be silenced by its
 * property (the markup attribute only decides what it starts as, so Angular
 * building the element left the person's own microphone audible), and a tile
 * that appears after its stream arrives has to still get it.
 */
describe('Meeting room tiles', () => {

  let room: MeetingRoomComponent;

  /** A video element as the browser hands it over: not muted, not playing. */
  const tile = () => {
    const el = document.createElement('video');
    (el as HTMLVideoElement & { play: () => Promise<void> }).play = () => {
      played.push(el);
      return Promise.resolve();
    };
    return el;
  };
  let played: HTMLVideoElement[];

  const stream = () => new MediaStream();

  beforeEach(async () => {
    played = [];
    await TestBed.configureTestingModule({
      imports: [MeetingRoomComponent],
      providers: [
        { provide: MeetingService, useValue: { publicInfo: () => of({ title: '', status: '', scheduledAt: '' }) } },
        { provide: AuthService, useValue: { isLoggedIn: () => false, user: () => null } },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: new Map() } } },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(MeetingRoomComponent);
    fixture.componentRef.setInput('code', 'abc-def-ghi');
    room = fixture.componentInstance;
  });

  afterEach(() => TestBed.resetTestingModule());

  it('silences your own tile, whatever the markup said', () => {
    const el = tile();

    (room as any).showOn(el, stream(), true);

    expect(el.muted).withContext('otherwise you hear your own microphone').toBeTrue();
  });

  it('leaves everyone else audible', () => {
    const el = tile();

    (room as any).showOn(el, stream(), false);

    expect(el.muted).withContext('this is the only way you hear the other person').toBeFalse();
  });

  it('puts the stream on the tile and starts it', () => {
    const el = tile();
    const s = stream();

    (room as any).showOn(el, s, false);

    expect(el.srcObject).toBe(s);
    expect(played).withContext('a tile attached before it was visible never starts on its own').toContain(el);
  });

  it('re-attaches a tile that arrived after the stream', () => {
    // Joining swaps the pre-join preview for the call's own tile; the new one
    // starts empty and has to be filled.
    const preview = tile();
    const s = stream();
    (room as any).showOn(preview, s, true);

    const inCall = tile();
    (room as any).showOn(inCall, s, true);

    expect(inCall.srcObject).toBe(s);
    expect(inCall.muted).toBeTrue();
  });

  it('does not restart a tile that already has the stream', () => {
    const el = tile();
    const s = stream();

    (room as any).showOn(el, s, false);
    played.length = 0;
    (room as any).showOn(el, s, false);

    expect(el.srcObject).toBe(s);
  });

  it('empties a tile whose peer has gone', () => {
    const el = tile();
    (room as any).showOn(el, stream(), false);

    (room as any).showOn(el, null, false);

    expect(el.srcObject).toBeNull();
  });

  it('survives a browser that refuses to autoplay', () => {
    const el = tile();
    (el as any).play = () => Promise.reject(new Error('NotAllowedError'));

    expect(() => (room as any).showOn(el, stream(), false)).not.toThrow();
  });
});

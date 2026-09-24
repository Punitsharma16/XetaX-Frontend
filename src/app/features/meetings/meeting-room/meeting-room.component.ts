import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  afterRenderEffect,
  computed,
  inject,
  input,
  signal,
  viewChildren,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import { AuthService } from '../../../core/authentication/auth.service';
import { environment } from '../../../../environments/environment';
import { Meeting, MeetingNote, MeetingService } from '../meeting.service';

interface Peer {
  id: string;
  name: string;
  pc: RTCPeerConnection;
  stream: MediaStream | null;
  micOn: boolean;
  camOn: boolean;
}

/**
 * The meeting room. Public page — guests arrive via the shared link
 * (roomCode + token); the owner is detected by an authenticated by-code
 * lookup which also unlocks the notes drawer and the End button.
 *
 * Media is a WebRTC mesh (newcomer offers to everyone already in the room —
 * deterministic, no glare); the backend only relays signaling over a
 * WebSocket, so nothing heavy ever touches the server. No recording.
 */
@Component({
  selector: 'app-meeting-room',
  standalone: true,
  imports: [DatePipe, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './meeting-room.component.html',
  styleUrl: './meeting-room.component.css',
})
export class MeetingRoomComponent implements OnDestroy {
  private readonly meetings = inject(MeetingService);
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);

  /** Route param (withComponentInputBinding). */
  readonly code = input.required<string>();

  readonly phase = signal<'prejoin' | 'incall' | 'left' | 'invalid'>('prejoin');
  readonly meetingTitle = signal('');
  readonly scheduledAt = signal('');
  readonly isHost = signal(false);
  readonly micOn = signal(true);
  readonly camOn = signal(true);
  readonly sharing = signal(false);
  readonly joining = signal(false);
  readonly mediaError = signal('');
  readonly peers = signal<Peer[]>([]);
  readonly leftReason = signal('');

  /* notes (host only) */
  readonly notesOpen = signal(false);
  readonly notes = signal<MeetingNote[]>([]);
  noteDraft = '';
  readonly savingNote = signal(false);

  displayName = '';
  /** Signal so OnPush bindings (join button, tiles) react when media arrives. */
  readonly localStream = signal<MediaStream | null>(null);

  /**
   * What the local tile shows — the camera normally, the screen while sharing.
   * Kept apart from {@link localStream}, which stays the camera and mic the
   * call is actually sending.
   */
  private readonly localView = signal<MediaStream | null>(null);

  private readonly localVideos = viewChildren<ElementRef<HTMLVideoElement>>('localVideo');
  private readonly peerVideos = viewChildren<ElementRef<HTMLVideoElement>>('peerVideo');

  /**
   * Puts a stream on a tile and starts it playing.
   *
   * <p>muted is set here rather than in the template on purpose. Angular
   * builds the element and writes `muted` as an attribute, which only decides
   * what the element starts as — so a local tile marked muted in the markup
   * still played the person their own microphone back. Setting the property is
   * what actually silences it.
   */
  private showOn(el: HTMLVideoElement, stream: MediaStream | null, isLocal: boolean): void {
    // Your own tile is never heard; everyone else's always is.
    el.muted = isLocal;
    if (el.srcObject !== stream) el.srcObject = stream;
    // A tile that was attached before it was visible never starts on its own.
    if (stream) el.play().catch(() => { /* the browser may refuse until a tap */ });
  }

  private meeting: Meeting | null = null;
  private token = '';
  private ws: WebSocket | null = null;
  private myId = '';
  private screenStream: MediaStream | null = null;
  private readonly peerMap = new Map<string, Peer>();

  private readonly rtcConfig: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      {
        urls: 'turn:openrelay.metered.ca:443',
        username: 'openrelayproject',
        credential: 'openrelayproject',
      },
    ],
  };

  readonly gridClass = computed(() => {
    const count = this.peers().length + 1;
    return count <= 1 ? 'grid-1' : count === 2 ? 'grid-2' : count <= 4 ? 'grid-4' : 'grid-many';
  });

  constructor() {
    this.token = this.route.snapshot.queryParamMap.get('t') ?? '';
    // Defer until the route input is bound.
    queueMicrotask(() => this.bootstrap());

    /*
     * Tiles get their stream here, after they are on the page, and again
     * whenever the streams or the people in the call change.
     *
     * It used to be a one-shot querySelector on a timer, which left two
     * things broken: joining swaps the pre-join preview for the call's own
     * tile, so nobody saw their own face once they were in; and a peer's tile
     * is drawn from a signal, so a stream arriving before Angular had drawn
     * that tile was attached to nothing and the other person was never heard.
     */
    afterRenderEffect(() => {
      const view = this.localView();
      for (const ref of this.localVideos()) this.showOn(ref.nativeElement, view, true);

      const streamOf = new Map(this.peers().map((peer) => [peer.id, peer.stream]));
      for (const ref of this.peerVideos()) {
        const el = ref.nativeElement;
        this.showOn(el, streamOf.get(el.dataset['peer'] ?? '') ?? null, false);
      }
    });
  }

  private bootstrap(): void {
    const code = this.code();
    if (!code || !this.token) {
      this.phase.set('invalid');
      return;
    }
    this.meetings.publicInfo(code, this.token).subscribe({
      next: (info) => {
        this.meetingTitle.set(info.title);
        this.scheduledAt.set(info.scheduledAt || '');
      },
      error: () => this.phase.set('invalid'),
    });
    // Owner check — ONLY when a CRM session exists. Guests have no JWT, and
    // firing an authed call for them would trip the auth interceptor's
    // session-expired redirect and bounce them to /login.
    if (this.auth.user()) {
      this.meetings.byCode(code).subscribe({
        next: (meeting) => {
          this.meeting = meeting;
          this.isHost.set(true);
          if (!this.displayName) this.displayName = 'Host';
          this.loadNotes();
        },
        error: () => this.isHost.set(false),
      });
    }
    this.startPreview();
  }

  private async startPreview(): Promise<void> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      this.localStream.set(stream);
      this.localView.set(stream);
      this.mediaError.set('');
    } catch (error: unknown) {
      const name = (error as { name?: string })?.name;
      this.mediaError.set(
        name === 'NotAllowedError'
          ? 'Camera/mic permission denied — allow it in the browser settings and reload.'
          : name === 'NotFoundError'
            ? 'No camera or microphone was found.'
            : 'Could not start the camera/mic: ' + name,
      );
    }
  }

  /* ---------------------------------------------------------------- join */

  join(): void {
    if (!this.localStream()) {
      this.startPreview();
      return;
    }
    if (!this.displayName.trim()) this.displayName = this.isHost() ? 'Host' : 'Guest';
    this.joining.set(true);

    const base = environment.crmBaseUrl.replace(/^http/, 'ws');
    const url = `${base}/ws/meeting?room=${encodeURIComponent(this.code())}&t=${encodeURIComponent(this.token)}&name=${encodeURIComponent(this.displayName.trim())}`;
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this.joining.set(false);
      this.phase.set('incall');
    };
    this.ws.onmessage = (event) => this.onSignal(JSON.parse(event.data));
    this.ws.onclose = () => {
      if (this.phase() === 'incall') this.leave('Connection closed');
      else if (this.joining()) {
        this.joining.set(false);
        this.mediaError.set('Could not join — the link expired or the meeting has ended.');
      }
    };
  }

  private async onSignal(msg: Record<string, unknown> & { type: string }): Promise<void> {
    switch (msg.type) {
      case 'welcome': {
        this.myId = msg['you'] as string;
        // Newcomer (us) offers to everyone already present.
        for (const peer of (msg['peers'] as { id: string; name: string }[]) ?? []) {
          const connection = this.createPeer(peer.id, peer.name);
          const offer = await connection.pc.createOffer();
          await connection.pc.setLocalDescription(offer);
          this.send({ type: 'offer', to: peer.id, sdp: offer });
        }
        break;
      }
      case 'peer-joined':
        // The newcomer will send us an offer; nothing to do yet.
        break;
      case 'offer': {
        const from = msg['from'] as string;
        const peer = this.peerMap.get(from) ?? this.createPeer(from, (msg['fromName'] as string) || 'Guest');
        await peer.pc.setRemoteDescription(msg['sdp'] as RTCSessionDescriptionInit);
        const answer = await peer.pc.createAnswer();
        await peer.pc.setLocalDescription(answer);
        this.send({ type: 'answer', to: from, sdp: answer });
        break;
      }
      case 'answer': {
        const peer = this.peerMap.get(msg['from'] as string);
        await peer?.pc.setRemoteDescription(msg['sdp'] as RTCSessionDescriptionInit);
        break;
      }
      case 'ice': {
        const peer = this.peerMap.get(msg['from'] as string);
        if (peer && msg['candidate']) {
          await peer.pc.addIceCandidate(msg['candidate'] as RTCIceCandidateInit).catch(() => {});
        }
        break;
      }
      case 'media-state': {
        const peer = this.peerMap.get(msg['from'] as string);
        if (peer) {
          peer.micOn = msg['mic'] as boolean;
          peer.camOn = msg['cam'] as boolean;
          if (msg['name']) peer.name = msg['name'] as string;
          this.syncPeers();
        }
        break;
      }
      case 'peer-left':
        this.removePeer(msg['id'] as string);
        break;
      case 'meeting-ended':
        this.leave('The host ended the meeting');
        break;
      case 'room-full':
        this.leave('The room is full — it has reached the participant limit');
        break;
    }
  }

  private createPeer(id: string, name: string): Peer {
    const pc = new RTCPeerConnection(this.rtcConfig);
    const peer: Peer = { id, name, pc, stream: null, micOn: true, camOn: true };

    const stream = this.localStream();
    stream?.getTracks().forEach((track) => pc.addTrack(track, stream));

    pc.ontrack = (event) => {
      peer.stream = event.streams[0] ?? null;
      // syncPeers() redraws the tiles; the render effect attaches the stream
      // once that tile exists, whichever order the two happen in.
      this.syncPeers();
    };
    pc.onicecandidate = (event) => {
      if (event.candidate) this.send({ type: 'ice', to: id, candidate: event.candidate });
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed') this.removePeer(id);
    };

    this.peerMap.set(id, peer);
    this.syncPeers();
    // Let the new peer know our current mute state + name.
    this.send({ type: 'media-state', mic: this.micOn(), cam: this.camOn(), name: this.displayName });
    return peer;
  }

  private removePeer(id: string): void {
    const peer = this.peerMap.get(id);
    if (!peer) return;
    peer.pc.close();
    this.peerMap.delete(id);
    this.syncPeers();
  }

  private syncPeers(): void {
    this.peers.set([...this.peerMap.values()]);
  }

  private send(payload: Record<string, unknown>): void {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(payload));
  }

  /* ------------------------------------------------------------ controls */

  toggleMic(): void {
    const track = this.localStream()?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    this.micOn.set(track.enabled);
    this.send({ type: 'media-state', mic: this.micOn(), cam: this.camOn(), name: this.displayName });
  }

  toggleCam(): void {
    const track = this.localStream()?.getVideoTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    this.camOn.set(track.enabled);
    this.send({ type: 'media-state', mic: this.micOn(), cam: this.camOn(), name: this.displayName });
  }

  async toggleShare(): Promise<void> {
    try {
      if (this.sharing()) {
        this.screenStream?.getTracks().forEach((track) => track.stop());
        this.screenStream = null;
        await this.replaceVideoTrack(this.localStream()?.getVideoTracks()[0] ?? null);
        this.sharing.set(false);
        return;
      }
      this.screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      const screenTrack = this.screenStream.getVideoTracks()[0];
      screenTrack.onended = () => this.toggleShare();
      await this.replaceVideoTrack(screenTrack);
      this.sharing.set(true);
    } catch {
      /* user cancelled the picker */
    }
  }

  private async replaceVideoTrack(track: MediaStreamTrack | null): Promise<void> {
    for (const peer of this.peerMap.values()) {
      const sender = peer.pc.getSenders().find((s) => s.track?.kind === 'video');
      if (sender && track) await sender.replaceTrack(track);
    }
    // Local tile follows whatever is being sent (camera or screen).
    const camStream = this.localStream();
    if (track && camStream) {
      if (track === camStream.getVideoTracks()[0]) {
        this.localView.set(camStream);
      } else {
        const mixed = new MediaStream([track]);
        camStream.getAudioTracks().forEach((audio) => mixed.addTrack(audio));
        this.localView.set(mixed);
      }
    }
  }

  leave(reason = ''): void {
    this.leftReason.set(reason);
    this.cleanup();
    this.phase.set('left');
  }

  endForAll(): void {
    if (!this.meeting) return;
    this.send({ type: 'end-meeting' });
    this.meetings.end(this.meeting.id).subscribe();
    this.leave('Meeting ended');
  }

  rejoin(): void {
    window.location.reload();
  }

  /* --------------------------------------------------------------- notes */

  private loadNotes(): void {
    if (!this.meeting) return;
    this.meetings.notes(this.meeting.id).subscribe({ next: (list) => this.notes.set(list) });
  }

  addNote(): void {
    if (!this.meeting || !this.noteDraft.trim()) return;
    this.savingNote.set(true);
    this.meetings.addNote(this.meeting.id, this.noteDraft.trim()).subscribe({
      next: (note) => {
        this.savingNote.set(false);
        this.notes.update((list) => [...list, note]);
        this.noteDraft = '';
      },
      error: () => this.savingNote.set(false),
    });
  }

  deleteNote(note: MeetingNote): void {
    if (!this.meeting) return;
    this.meetings.deleteNote(this.meeting.id, note.id).subscribe({
      next: () => this.notes.update((list) => list.filter((n) => n.id !== note.id)),
    });
  }

  /* ------------------------------------------------------------- cleanup */

  private cleanup(): void {
    this.peerMap.forEach((peer) => peer.pc.close());
    this.peerMap.clear();
    this.syncPeers();
    this.ws?.close();
    this.ws = null;
    this.screenStream?.getTracks().forEach((track) => track.stop());
    this.localStream()?.getTracks().forEach((track) => track.stop());
    this.localStream.set(null);
    this.localView.set(null);
  }

  ngOnDestroy(): void {
    this.cleanup();
  }
}

import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { VoiceService } from '../../voice.service';
import { VoiceResponse } from '../../voice.models';

@Component({
  selector: 'app-voice-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './voice-input.html',
  styleUrl: './voice-input.css',
})
export class VoiceInput implements OnDestroy {
  selectedFile: File | null = null;
  isProcessing = false;
  result: VoiceResponse | null = null;
  error = '';
  audioUrl: string | null = null;

  isRecording = false;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  recordedBlob: Blob | null = null;
  recordedUrl: string | null = null;
  private mediaStream: MediaStream | null = null;

  constructor(private voiceService: VoiceService) {}

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
      this.error = '';
      this.result = null;
      this.audioUrl = null;
      this.recordedBlob = null;
      this.recordedUrl = null;
    }
  }

  toggleRecording(): void {
    if (this.isRecording) {
      this.stopRecording();
    } else {
      this.startRecording();
    }
  }

  private async startRecording(): Promise<void> {
    this.error = '';
    this.result = null;
    this.audioUrl = null;
    this.selectedFile = null;
    this.recordedBlob = null;
    if (this.recordedUrl) {
      URL.revokeObjectURL(this.recordedUrl);
      this.recordedUrl = null;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      this.error = 'Microphone access is not supported in this browser.';
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaStream = stream;
      this.mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      this.audioChunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        this.recordedBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        this.recordedUrl = URL.createObjectURL(this.recordedBlob);
        this.stopMediaStream();
      };

      this.mediaRecorder.start();
      this.isRecording = true;
    } catch {
      this.error = 'Microphone access denied or unavailable.';
    }
  }

  private stopRecording(): void {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
      this.isRecording = false;
    }
  }

  processAudio(): void {
    let file: File | null = this.selectedFile;

    if (!file && this.recordedBlob) {
      file = new File([this.recordedBlob], 'recording.webm', { type: 'audio/webm' });
    }

    if (!file) return;

    this.isProcessing = true;
    this.error = '';
    this.result = null;

    this.voiceService.processVoiceInput(file).subscribe({
      next: (res) => {
        this.result = res;
        this.isProcessing = false;
        if (res.audioFilePath) {
          this.audioUrl = res.audioFilePath;
          this.playAudio();
        }
      },
      error: () => {
        this.error = 'Failed to process audio. Please try again.';
        this.isProcessing = false;
      },
    });
  }

  playAudio(): void {
    if (this.audioUrl) {
      const audio = new Audio(this.audioUrl);
      audio.play();
    }
  }

  private stopMediaStream(): void {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
  }

  ngOnDestroy(): void {
    this.stopMediaStream();
    if (this.recordedUrl) {
      URL.revokeObjectURL(this.recordedUrl);
    }
  }
}

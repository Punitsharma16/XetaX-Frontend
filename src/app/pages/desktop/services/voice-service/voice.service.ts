import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseService } from '../../../../acore/base/base.service';
import { UrlConstants } from '../../../../acore/util/url';
import { VoiceResponse } from './voice.models';

@Injectable({ providedIn: 'root' })
export class VoiceService {

  constructor(private base: BaseService) {}

  processVoiceInput(audioFile: File): Observable<VoiceResponse> {
    const formData = new FormData();
    formData.append('audioFile', audioFile);
    return this.base.postFormDataToAPI(UrlConstants.VOICE_PROCESS, formData, 'json');
  }
}

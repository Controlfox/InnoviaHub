import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { PersonalitySettings } from '../components/receptionist-personality/receptionist-personality.component';
import { AppConfigService } from '../core/app-config.service';
import { Observable } from 'rxjs';

export type AiTone =
  | 'neutral'
  | 'friendly'
  | 'professional'
  | 'cheerful'
  | 'direct'
  | 'sarcastic';
export type AiStyle = 'short' | 'balanced' | 'detailed';
export type AiEmoji = 0 | 1 | 2 | 3;

export interface AiProfile {
  userId: string;
  assistantName?: string | null;
  tone: AiTone;
  style: AiStyle;
  emoji: AiEmoji;
}

@Injectable({ providedIn: 'root' })
export class ReceptionistProfileService {
  private readonly url: string;

  constructor(private http: HttpClient, private cfg: AppConfigService) {
    this.url = `${this.cfg.apiUrl}/api/aiprofile`;
  }

  getProfile(userId: string): Observable<any> {
    return this.http.get<any>(`${this.url}/${userId}`);
  }

  saveProfile(userId: string, settings: PersonalitySettings): Observable<any> {
    const emojiNum = Math.max(0, Math.min(3, Number(settings.emoji))); //Tvångskonverterar
    const dto = {
      userId,
      assistantName: settings.assistantName ?? null,
      tone: settings.tone ?? 'neutral',
      style: settings.style ?? 'concise',
      emoji: Number.isFinite(emojiNum) ? emojiNum : 0,
    };
    return this.http.put<any>(`${this.url}/${userId}`, dto);
  }
}

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { PersonalitySettings } from '../components/receptionist-personality/receptionist-personality.component';

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
  private base =
    (window as any).__env?.NG_APP_API_URL ||
    'http://localhost:5184/api/aiprofile';

  constructor(private http: HttpClient) {}

  getProfile(userId: string) {
    return this.http.get<AiProfile>(`${this.base}/${userId}`);
  }

  saveProfile(userId: string, settings: PersonalitySettings) {
    const dto = {
      userId,
      assistantName: settings.assistantName,
      tone: settings.tone,
      style: settings.style,
      emoji: settings.emoji,
    };
    return this.http.put<AiProfile>(`${this.base}/${userId}`, dto);
  }
}

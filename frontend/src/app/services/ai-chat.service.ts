import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { AuthService } from './auth.service';

export type ChatRole = 'user' | 'assistant';
export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  ts: number;
}

const STORAGE_KEY = 'aiReceptionistSessionChat';
const MAX_CONTEXT_PAIRS = 8;

const API = (window as any).__env?.NG_APP_API_URL ?? 'http://localhost:5184';

@Injectable({ providedIn: 'root' })
export class AiChatService {
  private _messages$ = new BehaviorSubject<ChatMessage[]>(this.load());
  messages$ = this._messages$.asObservable();

  get messages(): ChatMessage[] {
    return this._messages$.value;
  }

  private save(msgs: ChatMessage[]) {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(msgs));
    this._messages$.next(msgs);
  }

  private load(): ChatMessage[] {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  reset() {
    this.save([]);
  }

  add(role: ChatRole, content: string) {
    const msg: ChatMessage = {
      id: crypto.randomUUID(),
      role,
      content,
      ts: Date.now(),
    };
    this.save([...this.messages, msg]);
  }

  private buildContext(): string {
    const pairs: { user?: string; assistant?: string }[] = [];
    let current: { user?: string; assistant?: string } | null = null;

    for (const m of this.messages) {
      if (m.role === 'user') {
        current = { user: m.content };
        pairs.push(current);
      } else if (m.role === 'assistant') {
        if (!current) {
          current = {};
          pairs.push(current);
        }
        current.assistant = m.content;
        current = null;
      }
    }

    const tail = pairs.slice(-MAX_CONTEXT_PAIRS);
    const lines: string[] = [];
    for (const p of tail) {
      if (p.user) lines.push(`User: ${p.user}`);
      if (p.assistant) lines.push(`Assistant: ${p.assistant}`);
    }
    return lines.join('\n');
  }

  /** Ställer en fråga via backend och lägger in svaret i flödet */
  async ask(question: string, userId?: string): Promise<string> {
    this.add('user', question);

    const context = this.buildContext();
    const combined = context
      ? `Tidigare konversation (komprimerad):\n${context}\n\nNy fråga:\n${question}`
      : question;

    const url = API ? `${API}/api/chat` : `/api/chat`; // funkar lokalt om du proxar

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: combined, userId }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      const errMsg = text || 'Kunde inte få svar just nu.';
      this.add('assistant', errMsg);
      throw new Error(errMsg);
    }

    // Din controller returnerar ren text i body
    const answer = await res.text();
    this.add('assistant', answer);
    return answer;
  }
}

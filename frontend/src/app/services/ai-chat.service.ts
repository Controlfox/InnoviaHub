import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

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
  private readonly _messages$ = new BehaviorSubject<ChatMessage[]>(this.load());
  readonly messages$ = this._messages$.asObservable();

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

  private replaceMessage(id: string, content: string) {
    const updated = this.messages.map((m) =>
      m.id === id ? { ...m, content } : m
    );
    this.save(updated);
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

  async ask(question: string, userId?: string): Promise<string> {
    this.add('user', question);

    const context = this.buildContext();
    const combined = context
      ? `Tidigare konversation (komprimerad):\n${context}\n\nNy fråga:\n${question}`
      : question;

    const url = `${API}/api/chat`;

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

    const answer = await res.text();
    this.add('assistant', answer);
    return answer;
  }

  askStream(question: string, userId?: string): Promise<string> {
    this.add('user', question);

    const assistantId = crypto.randomUUID();
    this.save([
      ...this.messages,
      { id: assistantId, role: 'assistant', content: '', ts: Date.now() },
    ]);

    const context = this.buildContext();
    const combined = context
      ? `Tidigare konversation (komprimerad):\n${context}\n\nNy fråga:\n${question}`
      : question;

    const url =
      `${API}/api/chat/stream?` +
      `q=${encodeURIComponent(combined)}` +
      (userId ? `&userId=${encodeURIComponent(userId)}` : '');

    return new Promise<string>((resolve, reject) => {
      const es = new EventSource(url);
      let buffer = '';

      es.addEventListener('response.output_text.delta', (evt: MessageEvent) => {
        try {
          const data = JSON.parse(evt.data);
          if (typeof data?.delta === 'string') {
            buffer += data.delta;
            this.replaceMessage(assistantId, buffer);
          }
        } catch {}
      });

      es.addEventListener('response.output_text.done', (evt: MessageEvent) => {
        try {
          const data = JSON.parse(evt.data);
          if (typeof data?.text === 'string') {
            buffer = data.text;
            this.replaceMessage(assistantId, buffer);
          }
        } catch {}
      });

      es.addEventListener('response.completed', () => {
        es.close();
        resolve(buffer);
      });

      es.onmessage = (evt) => {
        try {
          const data = JSON.parse(evt.data);
          if (typeof data?.delta === 'string') {
            buffer += data.delta;
            this.replaceMessage(assistantId, buffer);
          }
          if (data?.type === 'response.completed') {
            es.close();
            resolve(buffer);
          }
        } catch {}
      };

      es.onerror = () => {
        es.close();
        const msg = 'Strömmen avbröts eller ett fel uppstod.';
        this.replaceMessage(assistantId, buffer || msg);
        reject(new Error(msg));
      };
    });
  }
}

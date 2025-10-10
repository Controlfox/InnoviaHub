import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AiChatService } from '../../services/ai-chat.service';

@Component({
  selector: 'app-chat-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './chat-page.component.html',
})
export class ChatPageComponent {
  input = signal('');
  sending = signal(false);
  error = signal<string | null>(null);
  m: any;

  constructor(public chat: AiChatService) {}

  async send() {
    const q = this.input().trim();
    if (!q || this.sending()) return;
    this.error.set(null);
    this.sending.set(true);
    try {
      // STREAMAD!
      await this.chat.askStream(q);
      this.input.set('');
    } catch (e: any) {
      this.error.set(e?.message ?? 'Ett fel uppstod.');
    } finally {
      this.sending.set(false);
    }
  }

  onKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this.send();
    }
  }

  onInput(e: Event) {
    this.input.set((e.target as HTMLTextAreaElement).value);
  }

  clearSession() {
    this.chat.reset();
    this.error.set(null);
  }
}

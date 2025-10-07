import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AiChatService } from '../../services/ai-chat.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-chat-widget',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './chat-widget.component.html',
})
export class ChatWidgetComponent {
  isOpen = signal(false);
  input = signal('');
  sending = signal(false);
  error = signal<string | null>(null);
  m: any;

  constructor(public chat: AiChatService, private auth: AuthService) {}

  toggle() {
    this.isOpen.update((v) => !v);
  }

  async send() {
    const q = this.input().trim();
    if (!q || this.sending()) return;

    const userId = this.auth.getUserId();
    this.error.set(null);
    this.sending.set(true);
    try {
      await this.chat.ask(q, userId);
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

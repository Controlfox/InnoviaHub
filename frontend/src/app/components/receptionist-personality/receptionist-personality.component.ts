import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

export interface PersonalitySettings {
  assistantName: string;
  tone:
    | 'neutral'
    | 'friendly'
    | 'professional'
    | 'cheerful'
    | 'direct'
    | 'sarcastic';
  emoji: 0 | 1 | 2 | 3; // 0 = inga, 3 = många
  style: 'short' | 'balanced' | 'detailed';
}

@Component({
  selector: 'app-receptionist-personality',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './receptionist-personality.component.html',
})
export class ReceptionistPersonalityComponent {
  private fb = inject(FormBuilder);

  /** Inkommande defaultvärden */
  @Input() set value(v: Partial<PersonalitySettings> | null) {
    if (v) this.form.patchValue(v);
  }

  /** Emittas vid Save/Apply */
  @Output() save = new EventEmitter<PersonalitySettings>();

  /** Emittas live vid ändringar */
  @Output() changed = new EventEmitter<PersonalitySettings>();

  tones = [
    { value: 'cheerful', label: 'Glad och förstående' },
    { value: 'friendly', label: 'Vänlig' },
    { value: 'neutral', label: 'Helt neutral' },
    { value: 'professional', label: 'Professionell' },
    { value: 'direct', label: 'Rakt på sak' },
    { value: 'sarcastic', label: 'Torr/sarkastisk (lekfullt)' },
  ] as const;

  emojis = [
    { value: 0, label: 'Inga emojis' },
    { value: 1, label: 'Några emojis' },
    { value: 2, label: 'Lagom med emojis' },
    { value: 3, label: 'Många emojis' },
  ] as const;

  styles = [
    { value: 'short', label: 'Kort & koncist' },
    { value: 'balanced', label: 'Lagom detaljer' },
    { value: 'detailed', label: 'Detaljerat' },
  ] as const;

  form = this.fb.group({
    assistantName: this.fb.control<string>('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(40)],
    }),
    tone: this.fb.control<PersonalitySettings['tone']>('cheerful', {
      nonNullable: true,
    }),
    emoji: this.fb.control<PersonalitySettings['emoji']>(1, {
      nonNullable: true,
    }),
    style: this.fb.control<PersonalitySettings['style']>('balanced', {
      nonNullable: true,
    }),
  });

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.save.emit(this.form.getRawValue() as PersonalitySettings);
  }

  onSoftChange() {
    if (this.form.valid) {
      this.changed.emit(this.form.getRawValue() as PersonalitySettings);
    }
  }
}

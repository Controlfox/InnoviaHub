import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { ButtonComponent } from '../../components/button/button.component';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { Subject, takeUntil } from 'rxjs';
import { CommonModule } from '@angular/common';
import { MsalService } from '@azure/msal-angular';

@Component({
  selector: 'app-login-page',
  imports: [ButtonComponent, ReactiveFormsModule, RouterLink, CommonModule],
  templateUrl: './login-page.component.html',
  styleUrl: './login-page.component.css',
})
export class LoginPageComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private authService = inject(AuthService);
  private readonly _destroying$ = new Subject<void>();
  constructor(
    // ...
    private msal: MsalService
  ) {}

  isLoading = false;
  showTraditionalLogin = false;

  // Validera användares inmatning för inloggning
  loginForm = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required]),
  });

  async ngOnInit(): Promise<void> {
    // 1) Låt MSAL processa ev. redirect-resultat
    try {
      const result = await this.msal.instance.handleRedirectPromise();
      if (result?.account) {
        this.msal.instance.setActiveAccount(result.account);
      }
    } catch (e) {
      console.error('MSAL redirect handling failed', e);
    }

    // 2) Om användaren redan är inloggad → vidare till /profil
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/profil']);
      return;
    }
  }

  ngOnDestroy(): void {
    this._destroying$.next(undefined);
    this._destroying$.complete();
  }

  // Azure Entra ID login
  async loginWithMicrosoft(): Promise<void> {
    if (this.isLoading) return;
    this.isLoading = true;
    try {
      await this.authService.login(); // startar redirect
    } catch (e) {
      console.error('❌ Microsoft login error:', e);
      this.isLoading = false;
    }
  }

  // Traditionell e-post/lösenord login (för framtida användning)
  handleLogin() {
    console.log('📧 Traditional login attempted:', this.loginForm.value);

    // TODO: Implementera traditionell inloggning med backend
    // För nu, visa att denna funktion inte är implementerad än
    alert(
      'Traditionell inloggning är inte implementerad än. Använd "Logga in med Microsoft" istället.'
    );
  }

  // Växla mellan Microsoft-login och traditionell login
  toggleLoginMethod(): void {
    this.showTraditionalLogin = !this.showTraditionalLogin;
  }
}

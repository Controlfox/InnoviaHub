// src/pages/auth-redirect/auth-redirect.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MsalService } from '@azure/msal-angular';

@Component({
  standalone: true,
  imports: [CommonModule],
  template: `<p>Loggar in...</p>`,
})
export class AuthRedirectComponent implements OnInit {
  constructor(private msal: MsalService, private router: Router) {}

  async ngOnInit() {
    try {
      // Viktigt: låt MSAL läsa hash/query från URL:n här
      const result = await this.msal.instance.handleRedirectPromise();
      if (result?.account) {
        this.msal.instance.setActiveAccount(result.account);
        await this.router.navigate(['/profil']);
      } else {
        // Om ingen ny inloggning precis skedde, hoppa till profil om redan inloggad
        const acc =
          this.msal.instance.getActiveAccount() ||
          this.msal.instance.getAllAccounts()[0];
        if (acc) {
          this.msal.instance.setActiveAccount(acc);
          await this.router.navigate(['/profil']);
        } else {
          await this.router.navigate(['/logga-in']);
        }
      }
    } catch (e) {
      console.error('Redirect processing failed', e);
      await this.router.navigate(['/logga-in']);
    }
  }
}

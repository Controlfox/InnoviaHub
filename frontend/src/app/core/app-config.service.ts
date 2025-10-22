import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AppConfigService {
  readonly apiUrl = window.__env?.NG_APP_API_URL || 'http://localhost:5184';

  readonly hubUrl =
    window.__env?.NG_APP_HUB_URL || 'ws://localhost:5184/hubs/bookings';

  readonly loginRedirectUrl =
    window.__env?.NG_APP_LOGIN_REDIRECT_URL || 'http://localhost:4200/profil';

  readonly logoutRedirectUrl =
    window.__env?.NG_APP_LOGOUT_REDIRECT_URL ||
    'http://localhost:4200/logga-in';

  readonly deviceRegistryUrl =
    window.__env?.NG_APP_DEVICE_REGISTRY_URL || 'http://localhost:5101';
  readonly portalUrl =
    window.__env?.NG_APP_PORTAL_URL || 'http://localhost:5104';
  readonly realtimeHubUrl =
    window.__env?.NG_APP_REALTIME_HUB_URL ||
    'http://localhost:5103/hub/telemetry';
  readonly rulesUrl = window.__env?.NG_APP_RULES_URL || 'http://localhost:5105';
  readonly tenantSlug = window.__env?.NG_APP_TENANT_SLUG || 'innovia';
  readonly tenantId =
    window.__env?.NG_APP_TENANT_ID || '3fa85f64-5717-4562-b3fc-2c963f66afa6';
}

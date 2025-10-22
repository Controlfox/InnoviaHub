export {};

declare global {
  interface Window {
    __env?: {
      NG_APP_API_URL?: string;
      NG_APP_HUB_URL?: string;
      NG_APP_LOGIN_REDIRECT_URL?: string;
      NG_APP_LOGOUT_REDIRECT_URL?: string;

      NG_APP_DEVICE_REGISTRY_URL?: string;
      NG_APP_PORTAL_URL?: string;
      NG_APP_REALTIME_HUB_URL?: string;
      NG_APP_RULES_URL?: string;
      NG_APP_TENANT_SLUG?: string;
      NG_APP_TENANT_ID?: string;
    };
  }
}

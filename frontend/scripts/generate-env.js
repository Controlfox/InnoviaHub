const fs = require("fs");
const path = require("path");
require("dotenv").config(); //Läser env om den finns

//Fallback (temporarily using HTTP to avoid SSL issues)
const DEFAULT_DEVICE_REGISTRY = "http://localhost:5101";
const DEFAULT_PORTAL = "http://localhost:5104";
const DEFAULT_REALTIME_HUB = "http://localhost:5103/hub/telemetry";
const DEFAULT_RULES = "http://localhost:5105";
const DEFAULT_TENANT_SLUG = "innovia-tintin";
const DEFAULT_TENANT_ID = "4d217988-fcac-4158-b1be-d5a1e0a53a93";

const DEFAULT_API = "http://localhost:5184";
const DEFAULT_HUB = "ws://localhost:5184/hubs/bookings";
const DEFAULT_LOGIN_REDIRECT = "http://localhost:4200/profil";
const DEFAULT_LOGOUT_REDIRECT = "http://localhost:4200/logga-in";

//Läser värden från env
//const apiUrl = "https://innoviahub.hellbergsystems.se:8003";
const apiUrl = process.env.NG_APP_API_URL || DEFAULT_API;
const hubUrl = process.env.NG_APP_HUB_URL || DEFAULT_HUB;
const loginRedirectUrl =
  process.env.NG_APP_LOGIN_REDIRECT_URL || DEFAULT_LOGIN_REDIRECT;
const logoutRedirectUrl =
  process.env.NG_APP_LOGOUT_REDIRECT_URL || DEFAULT_LOGOUT_REDIRECT;

const deviceRegistryUrl =
  process.env.NG_APP_DEVICE_REGISTRY_URL || DEFAULT_DEVICE_REGISTRY;
const portalUrl = process.env.NG_APP_PORTAL_URL || DEFAULT_PORTAL;
const realtimeHubUrl =
  process.env.NG_APP_REALTIME_HUB_URL || DEFAULT_REALTIME_HUB;
const rulesUrl = process.env.NG_APP_RULES_URL || DEFAULT_RULES;
const tenantSlug = process.env.NG_APP_TENANT_SLUG || DEFAULT_TENANT_SLUG;
const tenantId = process.env.NG_APP_TENANT_ID || DEFAULT_TENANT_ID;

const outFile = path.resolve(__dirname, "../src/assets/env.js");
const content = `window.__env = {
  NG_APP_API_URL: '${apiUrl}',
  NG_APP_HUB_URL: '${hubUrl}',
  NG_APP_LOGIN_REDIRECT_URL: '${loginRedirectUrl}',
  NG_APP_LOGOUT_REDIRECT_URL: '${logoutRedirectUrl}',

  NG_APP_DEVICE_REGISTRY_URL: '${deviceRegistryUrl}',
  NG_APP_PORTAL_URL: '${portalUrl}',
  NG_APP_REALTIME_HUB_URL: '${realtimeHubUrl}',
  NG_APP_RULES_URL: '${rulesUrl}',
  NG_APP_TENANT_SLUG: '${tenantSlug}',
  NG_APP_TENANT_ID: '${tenantId}'
};\n`;

fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, content, "utf8");
console.log("[env] Wrote", outFile, "with:", {
  apiUrl,
  hubUrl,
  loginRedirectUrl,
  logoutRedirectUrl,
  deviceRegistryUrl,
  portalUrl,
  realtimeHubUrl,
  rulesUrl,
  tenantSlug,
  tenantId,
});

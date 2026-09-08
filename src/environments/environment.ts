/**
 * Production environment.
 *
 * All backend hosts live here — no URL is ever hardcoded in a service.
 *
 * Routing note (single-application backend):
 *  - The CRM backend is one Spring Boot application on port 8085. Auth was
 *    merged into it, so login/refresh/users (`/auth/v1/**`,
 *    `/auth/api/v1/users/**`) and the CRM APIs (`/api/forms`, `/api/record`,
 *    `/stage`, ...) are all served from the same host — no gateway, no
 *    Eureka, no path prefix.
 *  - The backend's CORS config allows the origin `http://localhost:5000`,
 *    which is why the dev server runs on port 5000 (see angular.json).
 */
export const environment = {
  production: true,

  /** Backend root (kept for anything still reading it). */
  gatewayUrl: 'http://localhost:8085',

  /** Auth endpoints root — /auth/v1/** and /auth/api/v1/**. */
  authBaseUrl: 'http://localhost:8085',

  /** CRM endpoints root — /api/forms, /api/record, /stage, ... */
  crmBaseUrl: 'http://localhost:8085',
};

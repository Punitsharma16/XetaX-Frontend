/**
 * Auth service contracts (AuthService-XetaX).
 *
 * Jackson naming note: the Java entity declares `private boolean isEnable` /
 * `private boolean isAdmin`, so Lombok emits `isEnable()` / `isAdmin()` and
 * Jackson serialises them as `enable` / `admin`. Both spellings are declared
 * optional here and normalised in AuthService, so the UI never depends on
 * which one a given build emits.
 */

/** POST /auth/v1/login */
export interface LoginRequest {
  email: string;
  password: string;
}

/** POST /auth/v1/refresh */
export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface AuthRole {
  name: string;
}

export type LoginProvider = 'LOCAL' | 'GOOGLE' | 'GITHUB';

/** AuthUserDto */
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  image?: string | null;
  phone?: string | null;
  company?: string | null;
  parentId?: string | null;
  createAt?: string;
  updateAt?: string;
  provider?: LoginProvider;
  roles?: AuthRole[];

  /** Serialised as `enable`; `isEnable` kept for tolerance. */
  enable?: boolean;
  isEnable?: boolean;

  /** Serialised as `admin`; `isAdmin` kept for tolerance. */
  admin?: boolean;
  isAdmin?: boolean;
}

/** Payload accepted by POST/PUT /auth/api/v1/users — password only on create. */
export interface AuthUserRequest extends Partial<AuthUser> {
  email: string;
  name: string;
  password?: string;
}

/** TokenResponse */
export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  /** Access-token lifetime in seconds. */
  expiresIn: number;
  tokenType: string;
  userDto: AuthUser;
}

/** Roles the UI knows how to gate on. */
export enum AppRole {
  Admin = 'ADMIN',
  Agent = 'AGENT',
  Reseller = 'RESELLER',
}

/** The session as the UI consumes it — flattened and normalised. */
export interface SessionUser {
  id: string;
  email: string;
  name: string;
  image: string | null;
  company: string | null;
  phone: string | null;
  isAdmin: boolean;
  isEnabled: boolean;
  roles: string[];
}

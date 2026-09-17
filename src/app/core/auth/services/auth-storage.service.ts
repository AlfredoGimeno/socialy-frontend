import {computed,inject,Injectable,PLATFORM_ID,signal} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { AuthResponse } from '../models/auth-response';
import { AuthSession } from '../models/auth-session';
import { UserRole } from '../models/user-role';

@Injectable({
  providedIn: 'root'
})
export class AuthStorageService {

  private readonly platformId = inject(PLATFORM_ID);

  private readonly isBrowser = isPlatformBrowser(this.platformId);

  private readonly storageKey = 'socialy_auth_session';

  private expirationTimer:ReturnType<typeof setTimeout> | null = null;

  private readonly sessionState =
    signal<AuthSession | null>(
      this.readSessionFromStorage()
    );

  readonly session = this.sessionState.asReadonly();

  readonly isAuthenticated = computed(() => this.sessionState() !== null);

  readonly role = computed(() => this.sessionState()?.role ?? null);

  constructor() {

    const session = this.sessionState();

    if (session) {
      this.scheduleExpiration(
        session.expiresAt
      );
    }
  }

  saveAuthResponse(
    response: AuthResponse
  ): void {

    const session: AuthSession = {
      ...response,
      expiresAt:
        Date.now() +
        response.expiresIn * 1000
    };

    if (this.isBrowser) {
      sessionStorage.setItem(
        this.storageKey,
        JSON.stringify(session)
      );
    }

    this.sessionState.set(session);

    this.scheduleExpiration(
      session.expiresAt
    );
  }

  getSession(): AuthSession | null {

    const session =
      this.sessionState();

    if (!session) {
      return null;
    }

    if (session.expiresAt <= Date.now()) {
      this.clearSession();
      return null;
    }

    return session;
  }

  getToken(): string | null {

    const session =
      this.getSession();

    return session?.token ?? null;
  }

  hasAnyRole(
    roles: UserRole[]
  ): boolean {

    const session =
      this.getSession();

    if (!session) {
      return false;
    }

    return roles.includes(
      session.role
    );
  }

  clearSession(): void {

    if (this.isBrowser) {
      sessionStorage.removeItem(
        this.storageKey
      );
    }

    this.sessionState.set(null);

    this.clearExpirationTimer();
  }

  private readSessionFromStorage():
    AuthSession | null {

    if (!this.isBrowser) {
      return null;
    }

    const storedSession =
      sessionStorage.getItem(
        this.storageKey
      );

    if (!storedSession) {
      return null;
    }

    try {

      const session =
        JSON.parse(
          storedSession
        ) as AuthSession;

      if (
        !session.token ||
        !session.role ||
        !session.expiresAt
      ) {
        sessionStorage.removeItem(
          this.storageKey
        );

        return null;
      }

      if (
        session.expiresAt <= Date.now()
      ) {
        sessionStorage.removeItem(
          this.storageKey
        );

        return null;
      }

      return session;

    } catch {

      sessionStorage.removeItem(
        this.storageKey
      );

      return null;
    }
  }

  private scheduleExpiration(
    expiresAt: number
  ): void {

    this.clearExpirationTimer();

    if (!this.isBrowser) {
      return;
    }

    const remainingTime =
      expiresAt - Date.now();

    if (remainingTime <= 0) {
      this.clearSession();
      return;
    }

    this.expirationTimer =
      setTimeout(
        () => {
          this.clearSession();
        },
        remainingTime
      );
  }

  private clearExpirationTimer():
    void {

    if (this.expirationTimer !== null) {

      clearTimeout(
        this.expirationTimer
      );

      this.expirationTimer = null;
    }
  }
}
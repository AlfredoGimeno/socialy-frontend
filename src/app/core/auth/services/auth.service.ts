import { inject, Injectable } from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Router} from '@angular/router';
import {Observable,tap} from 'rxjs';
import {API_BASE_URL} from '../../config/api.config';
import {LoginRequest} from '../models/login-request';
import {AuthResponse} from '../models/auth-response';
import {UserProfile} from '../models/user-profile';
import {AuthStorageService} from './auth-storage.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private readonly http = inject(HttpClient);

  private readonly router = inject(Router);

  private readonly storage = inject(AuthStorageService);

  readonly session = this.storage.session;

  readonly isAuthenticated = this.storage.isAuthenticated;

  readonly role = this.storage.role;

  login(request:LoginRequest):Observable<AuthResponse> {

    return this.http.post<AuthResponse>(
      `${API_BASE_URL}/auth/login`,
      request
    ).pipe(

      tap(response => {
        this.storage.saveAuthResponse(
          response
        );
      })

    );
  }

  getCurrentUser():Observable<UserProfile> {

    return this.http.get<UserProfile>(
      `${API_BASE_URL}/users/me`
    );
  }

  logout(): void {

    this.storage.clearSession();

    void this.router.navigate(
      ['/login']
    );
  }
}
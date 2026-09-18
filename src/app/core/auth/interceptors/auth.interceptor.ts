import {inject} from '@angular/core';

import {HttpErrorResponse,HttpInterceptorFn} from '@angular/common/http';

import {Router} from '@angular/router';

import {catchError,throwError} from 'rxjs';

import {API_BASE_URL} from '../../config/api.config';

import {AuthStorageService} from '../services/auth-storage.service';

export const authInterceptor:HttpInterceptorFn = (request, next) => {

    const storage = inject(AuthStorageService);

    const router = inject(Router);

    const token = storage.getToken();

    const isBackendRequest = request.url.startsWith(API_BASE_URL);

    const isPublicAuthRequest = request.url === `${API_BASE_URL}/auth/login` || request.url === `${API_BASE_URL}/auth/register`;

    /*
     * No añadimos JWT si:
     *
     * 1. La petición no va a nuestro backend.
     * 2. Es login o registro.
     * 3. No existe token.
     */
    if (!isBackendRequest || isPublicAuthRequest || !token) {
      return next(request);
    }

    const authenticatedRequest = request.clone({setHeaders: {Authorization:`Bearer ${token}`}});

    return next(
      authenticatedRequest
    ).pipe(

      catchError(
        (error: HttpErrorResponse) => {

          if (error.status === 401) {

            storage.clearSession();

            void router.navigate(
              ['/login']
            );
          }

          return throwError(
            () => error
          );
        }
      )

    );
  };
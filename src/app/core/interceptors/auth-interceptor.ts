
import {
  HttpInterceptorFn,
  HttpErrorResponse
} from '@angular/common/http';
import { inject } from '@angular/core';
import {
  catchError,
  finalize,
  shareReplay,
  switchMap,
  throwError,
  Observable
} from 'rxjs';
import {
  Auth,
  RefreshResponse
} from '../../features/auth/services/auth';

let refreshRequest$: Observable<RefreshResponse> | null = null;

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(Auth);

  const apiKey = 'b0bda99a-7f6b-497b-b338-d09686541e99';
  const apiUrl = 'https://restaurantapi.stepacademy.ge/';

  if (!req.url.startsWith(apiUrl)) {
    return next(req);
  }

  const isAuthRequest =
    req.url.includes('/api/auth/login') ||
    req.url.includes('/api/auth/register') ||
    req.url.includes('/api/auth/verify-email') ||
    req.url.includes('/api/auth/resend-email-verification') ||
    req.url.includes('/api/auth/forgot-password') ||
    req.url.includes('/api/auth/reset-password') ||
    req.url.includes('/api/auth/refresh-access-token');

  const token = auth.getToken();

  const headers: Record<string, string> = {
    'X-STEP-Key': apiKey
  };

  if (token && !isAuthRequest) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const request = req.clone({
    setHeaders: headers
  });

  return next(request).pipe(
    catchError((error: HttpErrorResponse) => {
      if (
        error.status !== 401 ||
        isAuthRequest ||
        !auth.getRefreshToken()
      ) {
        return throwError(() => error);
      }

      if (!refreshRequest$) {
        refreshRequest$ = auth.refreshAccessToken().pipe(
          switchMap(response => {
            auth.updateTokens(response);
            return [response];
          }),
          catchError(refreshError => {
            if (
              refreshError instanceof HttpErrorResponse &&
              (refreshError.status === 401 || refreshError.status === 404)
            ) {
              auth.logout();
            }

            return throwError(() => refreshError);
          }),
          finalize(() => {
            refreshRequest$ = null;
          }),
          shareReplay(1)
        );
      }

      return refreshRequest$.pipe(
        switchMap(response => {
          const retryRequest = request.clone({
            setHeaders: {
              Authorization: `Bearer ${response.data.accessToken}`
            }
          });

          return next(retryRequest);
        })
      );
    })
  );
};

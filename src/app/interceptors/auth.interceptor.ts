// src/app/interceptors/auth.interceptor.ts
import {
  HttpInterceptorFn,
  HttpRequest,
  HttpHandlerFn,
  HttpErrorResponse,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { Router } from '@angular/router';

import { AuthService, TOKEN_KEY } from '../services/auth.service';

export const AuthInterceptor: HttpInterceptorFn = (req: HttpRequest<any>, next: HttpHandlerFn) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  // Adjunta el bearer si hay token en memoria o localStorage
  let cloned = req;
  try {
    const token = auth.getToken?.() || (typeof localStorage !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null);
    if (token) {
      cloned = req.clone({
        setHeaders: { Authorization: `Bearer ${token}` },
      });
    }
  } catch {
    // no-op
  }

  return next(cloned).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401) {
        // Token inválido/expirado => limpiar sesión y (opcional) redirigir a login
        auth.logout();
        // router.navigate(['/login'], { queryParams: { returnUrl: router.url } });
      }
      return throwError(() => err);
    })
  );
};

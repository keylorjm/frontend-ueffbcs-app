// src/app/guards/auth.guard.ts
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { map, switchMap, of } from 'rxjs';

export const AuthGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // ✅ SSR-safe: solo ejecuta en navegador
  const isBrowser = typeof window !== 'undefined';
  const returnUrl = state.url || '/';

  // 🔁 Verificamos si el usuario ya está autenticado o si hay que cargarlo desde el backend
  return authService.isAuthenticated$.pipe(
    switchMap((isAuthenticated) => {
      // Si ya está autenticado → permitir acceso
      if (isAuthenticated) {
        return of(true);
      }

      // Si no, pero hay token, intentamos cargar el usuario actual
      const hasToken = authService.getToken() !== null;
      if (hasToken) {
        return authService.ensureUserLoaded().pipe(
          map((ok) => (ok ? true : router.createUrlTree(['/login'], { queryParams: { returnUrl } })))
        );
      }

      // Si no hay token → redirigir a login
      return of(router.createUrlTree(['/login'], { queryParams: { returnUrl } }));
    })
  );
};

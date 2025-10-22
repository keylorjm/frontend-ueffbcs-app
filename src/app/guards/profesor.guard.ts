// src/app/guards/profesor.guard.ts
import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { of, switchMap, map, take } from 'rxjs';

export const ProfesorGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const returnUrl = state.url || '/';

  return auth.isAuthenticated$.pipe(
    take(1),
    switchMap(isAuth => {
      // Sin sesión ni token → al login
      if (!isAuth && !auth.getToken()) {
        return of(router.createUrlTree(['/login'], { queryParams: { returnUrl } }));
      }

      // Ya autenticado → validar rol directamente
      if (isAuth) {
        const role = (auth.role ?? '').toLowerCase();
        if (role === 'profesor') return of(true);
        // Si es admin → mandarlo al panel admin
        return of(router.createUrlTree(['/app/usuarios']));
      }

      // Si hay token pero no está cargado el usuario aún
      return auth.ensureUserLoaded().pipe(
        map(ok => {
          if (!ok) return router.createUrlTree(['/login'], { queryParams: { returnUrl } });
          const role = (auth.role ?? '').toLowerCase();
          return role === 'profesor'
            ? true
            : router.createUrlTree(['/app/usuarios']);
        })
      );
    })
  );
};

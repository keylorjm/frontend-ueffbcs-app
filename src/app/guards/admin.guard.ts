// src/app/guards/admin.guard.ts
import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { of, switchMap, map, take } from 'rxjs';

export const AdminGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const returnUrl = state.url || '/';

  return auth.isAuthenticated$.pipe(
    take(1),
    switchMap(isAuth => {
      // Si no hay sesión y tampoco token → al login
      if (!isAuth && !auth.getToken()) {
        return of(router.createUrlTree(['/login'], { queryParams: { returnUrl } }));
      }

      // Si ya está autenticado → validar rol directamente
      if (isAuth) {
        const role = (auth.role ?? '').toLowerCase();
        if (role === 'admin') return of(true);
        // Si no es admin (por ejemplo profesor) → redirigir a su vista
        return of(router.createUrlTree(['/app/mis-cursos']));
      }

      // Si hay token pero aún no se cargó el usuario
      return auth.ensureUserLoaded().pipe(
        map(ok => {
          if (!ok) return router.createUrlTree(['/login'], { queryParams: { returnUrl } });
          const role = (auth.role ?? '').toLowerCase();
          return role === 'admin'
            ? true
            : router.createUrlTree(['/app/mis-cursos']);
        })
      );
    })
  );
};

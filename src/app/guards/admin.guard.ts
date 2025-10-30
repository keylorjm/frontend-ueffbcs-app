import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { map, switchMap, of } from 'rxjs';

export const AdminGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const isBrowser = typeof window !== 'undefined';
  const returnUrl = state.url || '/';

  return authService.isAuthenticated$.pipe(
    switchMap((isAuthenticated) => {
      // ✅ Si ya está autenticado → verificar rol
      if (isAuthenticated) {
        const role = (authService.getrole() ?? '').toLowerCase();
        if (role === 'admin') return of(true);
        if (role === 'profesor') return of(router.createUrlTree(['/app/mis-cursos']));
        return of(router.createUrlTree(['/login']));
      }

      // 🔐 Si no está autenticado pero hay token → intentar cargar usuario
      const hasToken = authService.getToken() !== null;
      if (hasToken) {
        return authService.ensureUserLoaded().pipe(
          map((ok): boolean | UrlTree => {
            if (!ok)
              return router.createUrlTree(['/login'], { queryParams: { returnUrl } });
            const role = (authService.getrole() ?? '').toLowerCase();
            if (role === 'admin') return true;
            if (role === 'profesor') return router.createUrlTree(['/app/mis-cursos']);
            return router.createUrlTree(['/login']);
          })
        );
      }

      // 🚫 No hay sesión ni token → al login
      return of(router.createUrlTree(['/login'], { queryParams: { returnUrl } }));
    })
  );
};

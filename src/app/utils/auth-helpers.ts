// src/app/utils/auth-helpers.ts
// Helpers tolerantes a distintas formas de AuthService y almacenamiento.
// Úsalos en cualquier componente/servicio que necesite el usuario actual o su ID.

export type UsuarioBasico = {
  _id?: string;
  uid?: string;
  id?: string;
  nombre?: string;
  correo?: string;
  rol?: string;
  token?: string;
  [k: string]: any;
};

/** Intenta obtener el objeto de usuario actual desde AuthService (o localStorage como fallback). */
export function resolveCurrentUser(authService: any): UsuarioBasico | undefined {
  try {
    // 1) Método común sincrónico
    if (authService?.getUsuarioSync) {
      const u = authService.getUsuarioSync();
      if (u) return u;
    }
    // 2) Propiedad directa
    if (authService?.usuarioActual) {
      const u = authService.usuarioActual;
      // Puede ser BehaviorSubject o el objeto directamente
      if (typeof u?.getValue === 'function') return u.getValue();
      return u;
    }
    // 3) currentUser$ típico (BehaviorSubject)
    if (authService?.currentUser$) {
      const subj = authService.currentUser$;
      if (typeof subj?.getValue === 'function') return subj.getValue();
    }
  } catch (_) { /* ignore */ }

  // 4) Fallback: localStorage
  try {
    const raw = localStorage.getItem('usuario') || localStorage.getItem('user');
    if (raw) return JSON.parse(raw);
  } catch (_) { /* ignore */ }

  return undefined;
}

/** Devuelve un ID consistente del usuario actual (_id | uid | id). */
export function resolveUserId(u: UsuarioBasico | undefined): string | undefined {
  if (!u) return undefined;
  return String(u._id || u.uid || u.id || '').trim() || undefined;
}

/** Devuelve un token JWT si está disponible en el usuario o en authService. */
export function resolveAuthToken(authService: any, u?: UsuarioBasico): string | undefined {
  // 1) Usuario con token
  if (u?.token) return String(u.token);
  // 2) Método común en servicios de auth
  try {
    if (authService?.getToken) {
      const t = authService.getToken();
      if (t) return String(t);
    }
  } catch (_) { /* ignore */ }
  // 3) localStorage
  try {
    const t = localStorage.getItem('token') || localStorage.getItem('auth_token');
    return t || undefined;
  } catch (_) { /* ignore */ }
  return undefined;
}

/** Predicados de rol (opcionales). */
export function isAdmin(u?: UsuarioBasico): boolean {
  return (u?.rol || '').toLowerCase() === 'admin';
}
export function isProfesor(u?: UsuarioBasico): boolean {
  return (u?.rol || '').toLowerCase() === 'profesor';
}

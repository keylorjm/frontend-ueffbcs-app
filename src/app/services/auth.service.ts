import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, BehaviorSubject, of, catchError, map, switchMap, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../environments/environment';
import { PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

// Export para reusar en interceptor
export const TOKEN_KEY = 'auth_token';

// Tipos
export interface AuthResponse {
  success: boolean;
  token: string;
  datos: {
    id: string;
    nombre: string;
    rol: 'admin' | 'profesor';
  };
}
export interface UserCredentials {
  correo: string;
  clave: string;
}

// Usuario actual (perfil) obtenido del backend
export interface CurrentUser {
  id: string;
  nombre: string;
  rol: 'admin' | 'profesor' | string;
  email?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private apiUrl = environment.apiUrl;
  private http = inject(HttpClient);
  private router = inject(Router); // 👇 SSR-safe: detecta plataforma

  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId); // Estado de autenticación (solo booleano)

  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  isAuthenticated$ = this.isAuthenticatedSubject.asObservable(); // Estado del usuario actual (perfil con rol)

  private _userSubject = new BehaviorSubject<CurrentUser | null>(null);
  user$ = this._userSubject.asObservable();

  constructor() {
    // Solo en navegador, inicializa estado real
    if (this.isBrowser) {
      const hasToken = this.checkToken();
      this.isAuthenticatedSubject.next(hasToken); // Si hay token al recargar, intenta cargar el usuario
      if (hasToken) {
        this.fetchCurrentUser().subscribe();
      }
    }
  } // --- Helpers de Estado ---

  private checkToken(): boolean {
    if (!this.isBrowser) return false;
    return !!localStorage.getItem(TOKEN_KEY);
  }

  getToken(): string | null {
    if (!this.isBrowser) return null;
    return localStorage.getItem(TOKEN_KEY);
  }

  get user(): CurrentUser | null {
    return this._userSubject.value;
  }

  get role(): string | null {
    return this._userSubject.value?.rol ?? null;
  }

  get isProfesor(): boolean {
    return (this.role ?? '').toLowerCase() === 'profesor';
  }

  get isAdmin(): boolean {
    return (this.role ?? '').toLowerCase() === 'admin';
  } // --- Flujo de Autenticación ---

  logout(): void {
    if (this.isBrowser) {
      localStorage.removeItem(TOKEN_KEY);
    }
    this.isAuthenticatedSubject.next(false);
    this._userSubject.next(null);
    if (this.isBrowser) {
      this.router.navigate(['/login']);
    }
  }

  login(credenciales: UserCredentials): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.apiUrl}/autenticacion/iniciarSesion`, credenciales)
      .pipe(
        tap((res) => {
          if (res?.success && res?.token && this.isBrowser) {
            localStorage.setItem(TOKEN_KEY, res.token);
            this.isAuthenticatedSubject.next(true);
          }
        }),
        // ✅ Usa switchMap para cargar el usuario, pero con una pequeña mejora:
        // Solo llama a fetchCurrentUser si el token se guardó exitosamente y el usuario NO está ya cargado.
        switchMap((res) => {
          if (res?.success && res.token) {
            // Si el usuario ya está cargado (lo cual es raro después de un login, pero es buena práctica)
            if (this._userSubject.value) {
              return of(res);
            }
            // Si no está cargado, lo cargamos y luego devolvemos la respuesta original.
            return this.fetchCurrentUser().pipe(map(() => res));
          }
          return of(res);
        })
      );
  }

  recuperarContrasena(correo: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/autenticacion/recuperarContrasena`, { correo });
  }

  restablecerContrasena(token: string, clave: string): Observable<AuthResponse> {
    // CORRECCIÓN: Codificamos el token para asegurar que se inserte correctamente en la URL.
    const encodedToken = encodeURIComponent(token);

    return this.http
      .put<AuthResponse>(`${this.apiUrl}/autenticacion/restablecerContrasena/${encodedToken}`, {
        clave,
      })
      .pipe(
        tap((res) => {
          if (res.success && res.token) {
            if (this.isBrowser) {
              localStorage.setItem(TOKEN_KEY, res.token);
            }
            this.isAuthenticatedSubject.next(true);
            this.fetchCurrentUser().subscribe();
          }
        }),
        catchError((err) => {
          return throwError(() => err);
        })
      );
  }

  fetchCurrentUser(): Observable<CurrentUser | null> {
    return this.http.get<any>(`${this.apiUrl}/usuarios/me`).pipe(
      map((raw: any): CurrentUser | null => {
        const usuarioData = raw.usuario;

        if (!usuarioData) return null;

        return {
          id: usuarioData?._id ?? usuarioData?.id ?? '',
          nombre: usuarioData?.nombre ?? usuarioData?.name ?? '',
          rol: usuarioData?.rol ?? usuarioData?.role ?? '',
          email: usuarioData?.email ?? usuarioData?.correo,
        };
      }),
      tap((u) => this._userSubject.next(u as CurrentUser)),
      catchError((_err) => {
        this._userSubject.next(null);
        this.isAuthenticatedSubject.next(false);
        return of(null);
      })
    );
  }

  ensureUserLoaded(): Observable<boolean> {
    if (this._userSubject.value) return of(true);
    if (!this.checkToken()) return of(false);
    return this.fetchCurrentUser().pipe(map((u) => !!u));
  }
}

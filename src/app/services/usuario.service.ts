// src/app/services/usuario.service.ts
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService } from './api.service';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';

// Tipo de unión basado en los roles disponibles
export type RolUsuario = 'admin' | 'profesor';

// 🛑 CLAVE: Cambiamos _id a uid para coincidir con la respuesta del backend
export interface Usuario {
  _id: string;
  nombre: string;
  cedula: string;
  correo: string;
  rol: RolUsuario;
  clave?: string;
}

// Interfaz que representa la respuesta completa del backend para listados
interface UsuariosResponse {
  ok: boolean;
  total: number;
  usuarios: Usuario[];
}

export const ROLES_DISPONIBLES = [
  { value: 'admin', viewValue: 'Administrador' },
  { value: 'profesor', viewValue: 'Profesor' },
];

@Injectable({
  providedIn: 'root',
})
export class UsuarioService {
  private api = inject(ApiService);        // para JSON
  private http = inject(HttpClient);       // para FormData (multipart)
  private basePath = 'usuarios';
  private apiRoot = '/api';                // asegura prefijo correcto para HttpClient

  getProfesores(): Observable<Usuario[]> {
    return this.api.get<UsuariosResponse>(`${this.basePath}/profesores`).pipe(
      map((response) => response.usuarios)
    );
  }

  /** Importar usuarios desde Excel (.xlsx) con FormData (multipart) */
importarExcel(
    file: File,
    options?: { dryRun?: boolean; allowUpdate?: boolean }
  ): Observable<any> {
    const fd = new FormData();
    fd.append('file', file);

    // Si usas JWT por header:
    const token =
      localStorage.getItem('token') ||
      sessionStorage.getItem('token') ||
      ''; // ajusta si lo guardas en otro lado

    return this.api.postForm<any>(
      `${this.basePath}/import-excel`,
      fd,
      {
        dryRun: options?.dryRun ?? false,
        allowUpdate: options?.allowUpdate ?? true,
      },
      {
        // Si usas cookies de sesión/JWT:
        // withCredentials: true,
        // Si usas JWT por header:
        authToken: token || undefined,
      }
    );
  }

  getAll(): Observable<Usuario[]> {
    return this.api.get<UsuariosResponse>(this.basePath).pipe(
      map((response) => response.usuarios)
    );
  }

  getById(id: string): Observable<Usuario> {
    return this.api.get<Usuario>(`${this.basePath}/${id}`);
  }

  create(usuario: Usuario): Observable<Usuario> {
    return this.api.post<Usuario>(`${this.basePath}`, usuario);
  }

  update(id: string, usuario: Partial<Usuario>): Observable<Usuario> {
    return this.api.put<Usuario>(`${this.basePath}/${id}`, usuario);
  }

  delete(id: string): Observable<any> {
    return this.api.delete<any>(`${this.basePath}/${id}`);
  }
}

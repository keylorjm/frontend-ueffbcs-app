// src/app/services/usuario.service.ts

import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators'; // Importar map si es necesario
import { ApiService } from './api.service';

// Tipo de unión basado en los roles disponibles
export type RolUsuario = 'admin' | 'profesor';

// 🛑 CLAVE: Cambiamos _id a uid para coincidir con la respuesta del backend
export interface Usuario {
  _id: string;
  nombre: string;
  correo: string;
  rol: RolUsuario;
  clave?: string;
}

// Interfaz que representa la respuesta completa del backend para listados
interface UsuariosResponse {
  ok: boolean;
  total: number;
  usuarios: Usuario[]; // ⬅️ Array de usuarios, como devuelve el controlador
}

export const ROLES_DISPONIBLES = [
  { value: 'admin', viewValue: 'Administrador' },
  { value: 'profesor', viewValue: 'Profesor' },
];

@Injectable({
  providedIn: 'root',
})
export class UsuarioService {
  private api = inject(ApiService);
  private basePath = 'usuarios'; // 🛑 CRÍTICO: Aseguramos que se llama al endpoint correcto y se mapea la respuesta.

  getProfesores(): Observable<Usuario[]> {
    // La llamada al endpoint específico
    return this.api.get<UsuariosResponse>(`${this.basePath}/profesores`).pipe(
      // Extraemos el array 'usuarios' del objeto de respuesta completo
      map((response) => response.usuarios)
    );
  } // Obtener todos los usuarios

  getAll(): Observable<Usuario[]> {
    // Aquí también asumimos que tu endpoint base '/usuarios' devuelve UsuariosResponse
    return this.api.get<UsuariosResponse>(this.basePath).pipe(map((response) => response.usuarios));
  } // Obtener un solo usuario por ID

  getById(id: string): Observable<Usuario> {
    return this.api.get<Usuario>(`${this.basePath}/${id}`);
  } // Crear un nuevo usuario

  create(usuario: Usuario): Observable<Usuario> {
    return this.api.post<Usuario>(`${this.basePath}`, usuario);
  } // Actualizar un usuario existente

  update(id: string, usuario: Partial<Usuario>): Observable<Usuario> {
    return this.api.put<Usuario>(`${this.basePath}/${id}`, usuario);
  } // Eliminar un usuario

  delete(id: string): Observable<any> {
    return this.api.delete<any>(`${this.basePath}/${id}`);
  }
}

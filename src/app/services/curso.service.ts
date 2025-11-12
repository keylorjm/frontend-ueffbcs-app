// src/app/services/curso.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../environments/environment';

export interface MateriaAsignada {
  materia: string;   // id de materia
  profesor: string;  // id de profesor responsable para esa materia en el curso
}

export interface Curso {
  _id?: string;
  nombre: string;
  anioLectivo: string;
  profesorTutor: string;
  estudiantes: string[];       // puede venir como ids
  materias: MateriaAsignada[]; // clave
}

@Injectable({ providedIn: 'root' })
export class CursoService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/cursos`;

  listar() {
    return this.http.get<any>(`${this.baseUrl}`);
  }

  obtener(id: string) {
    return this.http.get<any>(`${this.baseUrl}/${id}`);
  }

  /** 🆕 Si tu backend soporta populate con query (?populate=1) */
  obtenerDetallado(id: string, populate = true) {
    const url = populate ? `${this.baseUrl}/${id}?populate=1` : `${this.baseUrl}/${id}`;
    return this.http.get<any>(url);
  }

  crear(data: Curso) {
    console.log('[CursoService] POST /api/cursos', data);
    return this.http.post<any>(`${this.baseUrl}`, data);
  }

  actualizar(id: string, data: Curso) {
    console.log('[CursoService] PUT /api/cursos/' + id, data);
    return this.http.put<any>(`${this.baseUrl}/${id}`, data);
  }

  eliminar(id: string) {
    return this.http.delete<any>(`${this.baseUrl}/${id}`);
  }
  
}

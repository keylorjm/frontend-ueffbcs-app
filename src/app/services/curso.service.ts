import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from './api.service';

export interface Curso {
  _id?: string;
  nombre: string;
  anioLectivo: string;          // ObjectId
  profesorTutor: string;        // ObjectId de Usuario
  materias: string[];           // Array de ObjectId (Materia)
  estudiantes: string[];        // Array de ObjectId (Estudiante)
}

@Injectable({ providedIn: 'root' })
export class CursoService {
  private api = inject(ApiService);
  private base = 'cursos';

  getAll(params?: { profesorId?: string }): Observable<any[]> {
    return this.api.get<any>(this.base, params as any).pipe(
      map((res: any) => res?.cursos ?? [])
    );
  }

  getById(id: string): Observable<any> {
    return this.api.get<any>(`${this.base}/${id}`);
  }

  create(curso: {
    nombre: string;
    anioLectivo: string;
    profesorTutor: string;
    materias: string[];
    estudiantes: string[];
  }): Observable<any> {
    return this.api.post<any>(this.base, curso);
  }

  update(id: string, patch: Partial<Curso>): Observable<any> {
    return this.api.put<any>(`${this.base}/${id}`, patch);
  }

  delete(id: string): Observable<any> {
    return this.api.delete<any>(`${this.base}/${id}`);
  }
}

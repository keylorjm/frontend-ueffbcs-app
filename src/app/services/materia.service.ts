// src/app/services/materia.service.ts
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from './api.service';

export interface Materia {
  _id?: string;
  uid?: string;
  nombre: string;
  descripcion?: string;
  profesor: string; // ObjectId de Usuario (profesor)
  estado?: boolean;
}

interface MateriasResponse {
  ok: boolean;
  total?: number;
  materias: Materia[];
}

@Injectable({ providedIn: 'root' })
export class MateriaService {
  private api = inject(ApiService);
  private base = 'materias';

  // ✅ ahora retorna Observable<Materia[]>
  getAll(): Observable<Materia[]> {
    return this.api.get<MateriasResponse>(this.base).pipe(
      map((res) => res?.materias ?? [])
    );
  }

  getById(id: string): Observable<Materia> {
    return this.api.get<Materia>(`${this.base}/${id}`);
  }

  create(m: { nombre: string; descripcion?: string; profesor: string }): Observable<Materia> {
    return this.api.post<Materia>(this.base, m);
  }

  update(id: string, patch: Partial<Materia>): Observable<Materia> {
    return this.api.put<Materia>(`${this.base}/${id}`, patch);
  }

  delete(id: string): Observable<any> {
    return this.api.delete<any>(`${this.base}/${id}`);
  }
}

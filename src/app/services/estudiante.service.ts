// src/app/services/estudiante.service.ts
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from './api.service';

export interface Estudiante {
  _id?: string;       // <- por si tu backend usa _id
  uid?: string;       // <- tu interfaz original
  nombre: string;
  email: string;
  cedula: string;
  celular: string;
  estado?: boolean;
}

interface EstudianteResponse {
  ok: boolean;
  total: number;
  estudiantes: Estudiante[];
}

@Injectable({ providedIn: 'root' })
export class EstudianteService {
  private api = inject(ApiService);
  private basePath = 'estudiantes';

  getById(id: string): Observable<Estudiante> {
    return this.api.get<Estudiante>(`${this.basePath}/${id}`);
  }

  getAll(): Observable<Estudiante[]> {
    return this.api.get<EstudianteResponse>(this.basePath).pipe(
      map((response) => response.estudiantes)
    );
  }

  create(estudiante: Estudiante): Observable<Estudiante> {
    return this.api.post<Estudiante>(this.basePath, estudiante);
  }

  update(id: string, estudiante: Partial<Estudiante>): Observable<Estudiante> {
    return this.api.put<Estudiante>(`${this.basePath}/${id}`, estudiante);
  }

  delete(id: string): Observable<any> {
    return this.api.delete<any>(`${this.basePath}/${id}`);
  }

  // 🆕 Importar .xlsx
  importarExcel(
    file: File,
    options?: { dryRun?: boolean; allowUpdate?: boolean }
  ): Observable<any> {
    const fd = new FormData();
    fd.append('file', file);

    const params: Record<string, any> = {};
    if (options?.dryRun !== undefined) params['dryRun'] = String(options.dryRun);
    if (options?.allowUpdate !== undefined) params['allowUpdate'] = String(options.allowUpdate);

    return this.api.postForm<any>(`${this.basePath}/import-excel`, fd, params);
  }

  // 🆕 Helpers opcionales para resolver nombres cuando el curso trae sólo IDs
  getAllMap(): Observable<Map<string, Estudiante>> {
    return this.getAll().pipe(
      map((arr) => {
        const m = new Map<string, Estudiante>();
        for (const e of arr) {
          const key = (e._id ?? e.uid ?? '').toString();
          if (key) m.set(key, e);
        }
        return m;
      })
    );
  }

  pickManyByIds(ids: string[]): Observable<Estudiante[]> {
    const set = new Set(ids.filter(Boolean));
    return this.getAll().pipe(
      map((all) => {
        const idx = new Map<string, Estudiante>();
        for (const e of all) {
          const key = (e._id ?? e.uid ?? '').toString();
          if (key) idx.set(key, e);
        }
        return ids
          .filter(Boolean)
          .map((id) => idx.get(id) ?? ({ uid: id, nombre: id, email: '', cedula: '', celular: '' } as Estudiante));
      })
    );
  }
}

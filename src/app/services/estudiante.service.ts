// src/app/services/estudiante.service.ts
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService } from './api.service';

// Interface for the array item (CORREGIDA)
export interface Estudiante {
  uid?: string;      
  nombre: string;
  email: string;
  cedula: string;
  celular: string;
  estado?: boolean;
}

// Interface for the full API response object
interface EstudianteResponse {
  ok: boolean;
  total: number;
  estudiantes: Estudiante[];
}

@Injectable({ providedIn: 'root' })
export class EstudianteService {
  private api = inject(ApiService);
  private basePath = 'estudiantes';

  // ✅ Corregido: firma correcta
  getById(id: string): Observable<Estudiante> {
    return this.api.get<Estudiante>(`${this.basePath}/${id}`);
  }

  // OBTENER TODOS LOS ESTUDIANTES (mantiene el map para extraer el array)
  getAll(): Observable<Estudiante[]> {
    return this.api.get<EstudianteResponse>(this.basePath).pipe(
      map((response) => response.estudiantes)
    );
  }

  // MÉTODOS CRUD
  create(estudiante: Estudiante): Observable<Estudiante> {
    return this.api.post<Estudiante>(this.basePath, estudiante);
  }

  update(id: string, estudiante: Partial<Estudiante>): Observable<Estudiante> {
    return this.api.put<Estudiante>(`${this.basePath}/${id}`, estudiante);
  }

  delete(id: string): Observable<any> {
    return this.api.delete<any>(`${this.basePath}/${id}`);
  }

  // 🆕 Importar estudiantes desde Excel (.xlsx)
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
}

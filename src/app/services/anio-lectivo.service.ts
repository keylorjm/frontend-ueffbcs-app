import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable, throwError } from 'rxjs';
import { environment } from '../environments/environment';

export interface AnioLectivo {
  _id: string;
  uid?: string;
  nombre: string;
  fechaInicio: string | Date;
  fechaFin: string | Date;
  actual: boolean;
  // si tu backend usa "activo" boolean o "estado" string, ajusta el tipo
  activo?: boolean;
  estado?: 'activo' | 'inactivo';
  createdAt?: string;
  updatedAt?: string;
}

@Injectable({ providedIn: 'root' })
export class AnioLectivoService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/anios-lectivos`;

  /** GET /api/anios-lectivos */
  listar(): Observable<AnioLectivo[]> {
    return this.http.get<any>(this.base).pipe(map(r => r?.data ?? []));
  }

  obtenerActual(): Observable<AnioLectivo> {
  return this.http.get<any>(`${this.base}/actual`).pipe(
    map(r => r?.data ?? r)
  );
}

  /** GET /api/anios-lectivos/:id */
  obtenerUno(id: string): Observable<AnioLectivo> {
    return this.http.get<any>(`${this.base}/${id}`).pipe(map(r => r?.data));
  }

  /** POST /api/anios-lectivos */
  crear(payload: Partial<AnioLectivo>): Observable<AnioLectivo> {
    // Validaciones mínimas de cliente (opcionales)
    if (!payload?.nombre) return throwError(() => new Error('El nombre es obligatorio'));
    if (!payload?.fechaInicio) return throwError(() => new Error('La fecha de inicio es obligatoria'));
    if (!payload?.fechaFin) return throwError(() => new Error('La fecha de fin es obligatoria'));

    return this.http.post<any>(this.base, payload).pipe(map(r => r?.data));
  }

  /** PUT /api/anios-lectivos/:id */
  actualizar(id: string, payload: Partial<AnioLectivo>): Observable<AnioLectivo> {
    return this.http.put<any>(`${this.base}/${id}`, payload).pipe(map(r => r?.data));
  }

  /** DELETE /api/anios-lectivos/:id (soft/hard según tu backend) */
  eliminar(id: string): Observable<AnioLectivo> {
    return this.http.delete<any>(`${this.base}/${id}`).pipe(map(r => r?.data));
  }

  
  marcarActual(id: string): Observable<AnioLectivo> {
    return this.http.put<any>(`${this.base}/${id}/actual`, {}).pipe(map(r => r?.data));
  }
}

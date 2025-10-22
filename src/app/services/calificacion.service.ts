// src/app/services/calificacion.service.ts
import { Injectable, inject } from '@angular/core';
import { Observable, map, throwError } from 'rxjs';
import { ApiService } from './api.service';

export type Trimestre = 'T1' | 'T2' | 'T3';

export interface ObtenerNotasParams {
  cursoId: string;
  anioLectivoId: string; // requerido por tu backend
  materiaId: string;
  trimestre: Trimestre;
}

export interface NotaTrimestreInput {
  estudianteId: string;
  promedioTrimestral?: number;
  faltasJustificadas?: number;
  faltasInjustificadas?: number;
  // La cualitativa y cuantitativa las calcula el backend
}

export interface CalificacionRow {
  _id?: string;
  estudiante: { _id: string; uid?: string; nombre: string; apellido?: string };
  curso: string;
  anioLectivo: string;
  materia: string;
  T1?: {
    promedioTrimestral?: number;
    faltasJustificadas?: number;
    faltasInjustificadas?: number;
    calificacionCualitativa?: string;
    notaCuantitativa?: number;
  };
  T2?: CalificacionRow['T1'];
  T3?: CalificacionRow['T1'];
  promedioTrimestralAnual?: number;
  evaluacionFinal?: number;
  notaPromocion?: number;
}

@Injectable({ providedIn: 'root' })
export class CalificacionService {
  private api = inject(ApiService);
  private basePath = 'calificaciones';

  /** GET /api/calificaciones?cursoId=&anioLectivoId=&materiaId=&trimestre= */
  obtenerNotas(params: ObtenerNotasParams): Observable<CalificacionRow[]> {
    // Validaciones tempranas para evitar 400 del backend
    if (!params?.cursoId) {
      return throwError(() => new Error('cursoId es requerido'));
    }
    if (!params?.anioLectivoId) {
      return throwError(() => new Error('anioLectivoId es requerido'));
    }
    if (!params?.materiaId) {
      return throwError(() => new Error('materiaId es requerido'));
    }
    if (!params?.trimestre) {
      return throwError(() => new Error('trimestre es requerido (T1|T2|T3)'));
    }

    const q = new URLSearchParams({
      cursoId: String(params.cursoId),
      anioLectivoId: String(params.anioLectivoId),
      materiaId: String(params.materiaId),
      trimestre: params.trimestre,
    }).toString();

    return this.api.get<any>(`${this.basePath}?${q}`).pipe(
      map((resp) => (resp?.data ?? resp?.rows ?? resp ?? []) as CalificacionRow[])
    );
  }

  /** POST /api/calificaciones/bulk-trimestre */
  cargarTrimestreBulk(payload: {
    cursoId: string;
    anioLectivoId: string;
    materiaId: string;
    trimestre: Trimestre;
    notas: NotaTrimestreInput[];
  }): Observable<any> {
    // Validaciones tempranas (coinciden con el backend)
    if (!payload?.cursoId) return throwError(() => new Error('cursoId es requerido'));
    if (!payload?.anioLectivoId) return throwError(() => new Error('anioLectivoId es requerido'));
    if (!payload?.materiaId) return throwError(() => new Error('materiaId es requerido'));
    if (!payload?.trimestre) return throwError(() => new Error('trimestre es requerido (T1|T2|T3)'));
    if (!Array.isArray(payload?.notas) || payload.notas.length === 0) {
      return throwError(() => new Error('notas debe ser un array no vacío'));
    }

    return this.api.post<any>(`${this.basePath}/bulk-trimestre`, payload);
  }

  /** (Opcional) POST /api/calificaciones/final  */
  cargarEvaluacionFinal(body: {
    cursoId: string;
    anioLectivoId: string;
    materiaId: string;
    notas: Array<{ estudianteId: string; evaluacionFinal: number }>;
  }): Observable<any> {
    if (!body?.cursoId) return throwError(() => new Error('cursoId es requerido'));
    if (!body?.anioLectivoId) return throwError(() => new Error('anioLectivoId es requerido'));
    if (!body?.materiaId) return throwError(() => new Error('materiaId es requerido'));
    if (!Array.isArray(body?.notas) || body.notas.length === 0) {
      return throwError(() => new Error('notas debe ser un array no vacío'));
    }

    return this.api.post<any>(`${this.basePath}/final`, body);
  }
}

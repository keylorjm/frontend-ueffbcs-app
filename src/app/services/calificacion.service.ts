// src/app/services/calificacion.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../environments/environment';

export type Trimestre = 'T1' | 'T2' | 'T3';

export interface NotaTrimestre {
  promedioTrimestral: number | null;
  faltasJustificadas?: number;
  faltasInjustificadas?: number;
  asistenciaTotal?: number;
}

export interface NotaTrimestreInputRow {
  estudianteId: string;
  promedioTrimestral: number | null;
  faltasJustificadas?: number;
  faltasInjustificadas?: number;
  asistenciaTotal?: number;
}

export interface BulkTrimestrePayload {
  cursoId: string;
  anioLectivoId: string;
  materiaId: string;
  trimestre: Trimestre;
  rows: NotaTrimestreInputRow[];
}

export interface EvaluacionFinalPayload {
  cursoId: string;
  anioLectivoId: string;
  estudianteId: string;
  // Si tu backend requiere por materia para final, habilítalo:
  // materiaId?: string;
  evaluacionFinal?: number | null;
  cualitativaFinal?: string | null;
  observacionFinal?: string | null;
}

@Injectable({ providedIn: 'root' })
export class CalificacionService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/calificaciones`;

  obtenerNotas(params: {
    cursoId: string;
    anioLectivoId: string;
    materiaId: string;
    trimestre?: Trimestre;
  }) {
    let p = new HttpParams()
      .set('cursoId', params.cursoId)
      .set('anioLectivoId', params.anioLectivoId)
      .set('materiaId', params.materiaId);
    if (params.trimestre) p = p.set('trimestre', params.trimestre);
    return this.http.get<any>(`${this.baseUrl}`, { params: p });
  }

  cargarTrimestreBulk(payload: BulkTrimestrePayload) {
    return this.http.post<any>(`${this.baseUrl}/bulk-trimestre`, payload);
  }

  cargarFinal(payload: EvaluacionFinalPayload) {
    return this.http.post<any>(`${this.baseUrl}/final`, payload);
  }
}

// src/app/services/asistencia.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../environments/environment';
import { Observable } from 'rxjs';

export type Trimestre = 'T1' | 'T2' | 'T3';

export interface FaltasRow {
  estudianteId: string;
  faltasJustificadas: number;     // >= 0
  faltasInjustificadas: number;   // >= 0
}
export interface AsistenciaResumen {
  faltasJustificadas: number;
  faltasInjustificadas: number;
  diasLaborables: number;
}
export interface GuardarFaltasBulkPayload {
  cursoId: string;
  anioLectivoId: string;
  materiaId: string;
  trimestre: Trimestre;
  rows: FaltasRow[];
}

@Injectable({ providedIn: 'root' })
export class AsistenciaService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/asistencias`;

  /** Obtiene los días laborables configurados para un curso/materia/trimestre */
  getDiasLaborables(params: {
    cursoId: string; anioLectivoId: string; materiaId: string; trimestre: Trimestre;
  }): Observable<{ diasLaborables: number | null }> {
    let p = new HttpParams()
      .set('cursoId', params.cursoId)
      .set('anioLectivoId', params.anioLectivoId)
      .set('materiaId', params.materiaId)
      .set('trimestre', params.trimestre);
    return this.http.get<{ diasLaborables: number | null }>(`${this.baseUrl}/laborables`, { params: p });
  }

  /** Establece/actualiza los días laborables para un curso/materia/trimestre */
  setDiasLaborables(payload: {
    cursoId: string; anioLectivoId: string; materiaId: string; trimestre: Trimestre; diasLaborables: number;
  }) {
    return this.http.post<any>(`${this.baseUrl}/laborables`, payload);
  }

  /** Devuelve las faltas existentes (por estudiante) para un curso/materia/trimestre */
  obtenerFaltas(params: {
    cursoId: string; anioLectivoId: string; materiaId: string; trimestre: Trimestre;
  }): Observable<{ estudiantes: Array<{estudianteId: string; faltasJustificadas: number; faltasInjustificadas: number}> }> {
    let p = new HttpParams()
      .set('cursoId', params.cursoId)
      .set('anioLectivoId', params.anioLectivoId)
      .set('materiaId', params.materiaId)
      .set('trimestre', params.trimestre);
    return this.http.get<{ estudiantes: Array<{estudianteId: string; faltasJustificadas: number; faltasInjustificadas: number}> }>(
      `${this.baseUrl}`,
      { params: p }
    );
  }

  /** Guarda en bloque las faltas (justificadas/injustificadas) por estudiante para el trimestre */
  guardarFaltasBulk(payload: GuardarFaltasBulkPayload) {
    return this.http.post<any>(`${this.baseUrl}/bulk-faltas`, payload);
  }

  getResumenTrimestre(params: {
    cursoId: string;
    anioLectivoId: string;
    estudianteId: string;
    trimestre: Trimestre;
  }): Observable<AsistenciaResumen> {
    let p = new HttpParams()
      .set('cursoId', params.cursoId)
      .set('anioLectivoId', params.anioLectivoId)
      .set('estudianteId', params.estudianteId)
      .set('trimestre', params.trimestre);

    return this.http.get<AsistenciaResumen>(`${this.baseUrl}/resumen`, { params: p });
  }

}

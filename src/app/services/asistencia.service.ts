// src/app/services/asistencia.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../environments/environment';

// Reusa el mismo tipo de Trimestre que en CalificacionService
export type Trimestre = 'T1' | 'T2' | 'T3';

/** Fila de entrada para BULK de asistencias */
export interface AsistenciaInputRow {
  estudianteId: string;
  faltasJustificadas?: number;   // >= 0
  faltasInjustificadas?: number; // >= 0
  diasLaborados?: number;        // >= 0 (valor informativo por estudiante; el backend lo guarda por comodidad)
}

/** Payload para POST /api/asistencias/bulk-trimestre */
export interface BulkAsistenciaPayload {
  cursoId: string;
  anioLectivoId: string;
  materiaId: string;
  trimestre: Trimestre;
  rows: AsistenciaInputRow[];
}

/** Respuesta típica del GET /api/asistencias */
export interface AsistenciaGetResponse {
  estudiantes: Array<{
    estudianteId: string;
    estudianteNombre?: string;
    faltasJustificadas?: number;
    faltasInjustificadas?: number;
    diasLaborados?: number;
  }>;
}

@Injectable({ providedIn: 'root' })
export class AsistenciaService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/asistencias`;

  /**
   * Obtiene las asistencias del trimestre para (curso, año lectivo, materia).
   * GET /api/asistencias?cursoId=&anioLectivoId=&materiaId=&trimestre=
   */
  obtenerAsistencias(params: {
    cursoId: string;
    anioLectivoId: string;
    materiaId: string;
    trimestre: Trimestre;
  }) {
    let p = new HttpParams()
      .set('cursoId', params.cursoId)
      .set('anioLectivoId', params.anioLectivoId)
      .set('materiaId', params.materiaId)
      .set('trimestre', params.trimestre);

    return this.http.get<AsistenciaGetResponse>(this.baseUrl, { params: p });
  }

  /**
   * Guarda asistencias en bloque para un trimestre.
   * POST /api/asistencias/bulk-trimestre
   */
  cargarAsistenciaBulk(payload: BulkAsistenciaPayload) {
    return this.http.post<any>(`${this.baseUrl}/bulk-trimestre`, payload);
  }

  /**
   * Helper para construir el payload a partir de filas de UI.
   * Limpia NaN, fuerza mínimos a 0 y deja undefined los campos no enviados.
   */
  buildBulkPayload(input: {
    cursoId: string;
    anioLectivoId: string;
    materiaId: string;
    trimestre: Trimestre;
    tableRows: Array<{
      estudianteId: string;
      faltasJustificadas?: number | null;
      faltasInjustificadas?: number | null;
      diasLaborados?: number | null;
    }>;
  }): BulkAsistenciaPayload {
    const norm = (v: any) =>
      typeof v === 'number' && !isNaN(v) ? Math.max(0, Math.floor(v)) : undefined;

    const rows: AsistenciaInputRow[] = input.tableRows.map((r) => ({
      estudianteId: String(r.estudianteId),
      faltasJustificadas: norm(r.faltasJustificadas),
      faltasInjustificadas: norm(r.faltasInjustificadas),
      diasLaborados: norm(r.diasLaborados),
    }));

    return {
      cursoId: input.cursoId,
      anioLectivoId: input.anioLectivoId,
      materiaId: input.materiaId,
      trimestre: input.trimestre,
      rows,
    };
  }
}

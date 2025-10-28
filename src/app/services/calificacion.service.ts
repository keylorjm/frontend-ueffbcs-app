// src/app/services/calificacion.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../environments/environment';
import { Observable, map } from 'rxjs';

/** === Tipos base (tu API) === */
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
  // materiaId?: string; // habilítalo si tu backend lo requiere también para final
  evaluacionFinal?: number | null;
  cualitativaFinal?: string | null;
  observacionFinal?: string | null;
}

/** === Tipos de respuesta recomendados (flexibles ante populate o IDs planos) === */
export interface NotaTrimestreItemAPI {
  estudianteId: string;                 // id plano
  estudianteNombre?: string;            // opcional, por si el backend lo adjunta
  promedioTrimestral?: number | null;
  faltasJustificadas?: number;
  faltasInjustificadas?: number;
  asistenciaTotal?: number;
}

export interface NotasTrimestreResponse {
  curso: { _id: string; nombre?: string } | string;
  anioLectivo: { _id: string; nombre?: string } | string;
  materia: { _id: string; nombre?: string } | string;
  trimestre?: Trimestre;
  estudiantes: NotaTrimestreItemAPI[];  // arreglo por estudiante
}

export interface CargarBulkResponse {
  ok: boolean;
  updated?: number;                     // cantidad de registros actualizados
  message?: string;
}

export interface CargarFinalResponse {
  ok: boolean;
  message?: string;
}

/** === Servicio === */
@Injectable({ providedIn: 'root' })
export class CalificacionService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/calificaciones`;

  /**
   * GET /calificaciones
   * Params: cursoId, anioLectivoId, materiaId, trimestre?
   */
  obtenerNotas(params: {
    cursoId: string;
    anioLectivoId: string;
    materiaId: string;
    trimestre?: Trimestre;
  }): Observable<NotasTrimestreResponse> {
    let p = new HttpParams()
      .set('cursoId', params.cursoId)
      .set('anioLectivoId', params.anioLectivoId)
      .set('materiaId', params.materiaId);
    if (params.trimestre) p = p.set('trimestre', params.trimestre);

    return this.http.get<NotasTrimestreResponse>(`${this.baseUrl}`, { params: p }).pipe(
      map((res) => this.normalizarNotasTrimestreResponse(res))
    );
  }

  /**
   * POST /calificaciones/bulk-trimestre
   * Guarda en lote las notas de un trimestre para una materia de un curso.
   */
  cargarTrimestreBulk(payload: BulkTrimestrePayload): Observable<CargarBulkResponse> {
    const limpio = this.sanitizarBulkPayload(payload);
    return this.http.post<CargarBulkResponse>(`${this.baseUrl}/bulk-trimestre`, limpio);
  }

  /**
   * POST /calificaciones/final
   * Guarda evaluación/cualitativa/observación final por estudiante (y opcional materia).
   */
  cargarFinal(payload: EvaluacionFinalPayload): Observable<CargarFinalResponse> {
    const limpio = this.sanitizarFinalPayload(payload);
    return this.http.post<CargarFinalResponse>(`${this.baseUrl}/final`, limpio);
  }

  /** === Helpers de dominio (opcionales pero útiles para la UI) === */

  /**
   * Normaliza la respuesta del backend a una estructura consistente para la tabla.
   * - Garantiza números (0) cuando vengan undefined/null.
   * - Asegura arreglo vacío si no hay estudiantes.
   */
  private normalizarNotasTrimestreResponse(res: any): NotasTrimestreResponse {
    const estudiantesRaw: any[] = Array.isArray(res?.estudiantes) ? res.estudiantes : [];
    const estudiantes = estudiantesRaw.map((e) => ({
      estudianteId: this.asId(e?.estudiante ?? e?.estudianteId ?? e?.id ?? e),
      estudianteNombre: e?.estudianteNombre ?? e?.nombre ?? e?.estudiante?.nombre ?? '—',
      promedioTrimestral: this.toNumOrNull(e?.promedioTrimestral),
      faltasJustificadas: this.toNumber(e?.faltasJustificadas, 0),
      faltasInjustificadas: this.toNumber(e?.faltasInjustificadas, 0),
      asistenciaTotal: this.toNumber(e?.asistenciaTotal, 0),
    })) as NotaTrimestreItemAPI[];

    return {
      curso: res?.curso ?? '',
      anioLectivo: res?.anioLectivo ?? '',
      materia: res?.materia ?? '',
      trimestre: res?.trimestre as Trimestre | undefined,
      estudiantes
    };
  }

  /**
   * Construye el payload Bulk desde una tabla de edición.
   * Valida rangos básicos: promedio 0..100, faltas >= 0.
   */
  buildBulkPayload(input: {
    cursoId: string;
    anioLectivoId: string;
    materiaId: string;
    trimestre: Trimestre;
    tableRows: Array<{
      estudianteId: string;
      promedioTrimestral: number | null | undefined;
      faltasJustificadas?: number | null | undefined;
      faltasInjustificadas?: number | null | undefined;
      asistenciaTotal?: number | null | undefined;
    }>;
  }): BulkTrimestrePayload {
    const rows: NotaTrimestreInputRow[] = (input.tableRows ?? []).map((r) => ({
      estudianteId: String(r.estudianteId),
      promedioTrimestral: this.clampProm(r.promedioTrimestral),
      faltasJustificadas: this.toNumber(r.faltasJustificadas, 0),
      faltasInjustificadas: this.toNumber(r.faltasInjustificadas, 0),
      asistenciaTotal: this.toNumber(r.asistenciaTotal, 0),
    }));
    return {
      cursoId: String(input.cursoId),
      anioLectivoId: String(input.anioLectivoId),
      materiaId: String(input.materiaId),
      trimestre: input.trimestre,
      rows
    };
  }

  /**
   * Cualitativa por escala (puedes ajustar los umbrales a tu normativa).
   */
  cualitativa(prom: number | null | undefined): string {
    const p = Number(prom ?? 0);
    if (p >= 90) return 'Excelente';
    if (p >= 80) return 'Muy Bueno';
    if (p >= 70) return 'Bueno';
    if (p >= 60) return 'Regular';
    return 'Insuficiente';
  }

  /** === Sanitizadores/validaciones internas === */

  private sanitizarBulkPayload(p: BulkTrimestrePayload): BulkTrimestrePayload {
    return {
      ...p,
      cursoId: String(p.cursoId),
      anioLectivoId: String(p.anioLectivoId),
      materiaId: String(p.materiaId),
      trimestre: p.trimestre,
      rows: (p.rows ?? []).map((r) => ({
        estudianteId: String(r.estudianteId),
        promedioTrimestral: this.clampProm(r.promedioTrimestral),
        faltasJustificadas: this.toNumber(r.faltasJustificadas, 0),
        faltasInjustificadas: this.toNumber(r.faltasInjustificadas, 0),
        asistenciaTotal: this.toNumber(r.asistenciaTotal, 0),
      }))
    };
  }

  private sanitizarFinalPayload(p: EvaluacionFinalPayload): EvaluacionFinalPayload {
    const evaluacionFinal = this.clampProm(p.evaluacionFinal);
    const cualitativaFinal = p.cualitativaFinal ?? (evaluacionFinal != null ? this.cualitativa(evaluacionFinal) : null);
    return {
      ...p,
      cursoId: String(p.cursoId),
      anioLectivoId: String(p.anioLectivoId),
      estudianteId: String(p.estudianteId),
      evaluacionFinal,
      cualitativaFinal,
      observacionFinal: p.observacionFinal ?? null
    };
  }

  /** === Utils seguros === */

  private toNumber(v: any, def = 0): number {
    const n = Number(v);
    return Number.isFinite(n) ? n : def;
  }
  private toNumOrNull(v: any): number | null {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
    }
  private clampProm(v: any): number | null {
    const n = this.toNumOrNull(v);
    if (n == null) return null;
    if (n < 0) return 0;
    if (n > 100) return 100;
    return n;
  }
  private asId(val: any): string {
    if (!val) return '';
    if (typeof val === 'string') return val;
    if (typeof val === 'object' && val._id) return String(val._id);
    return String(val);
  }
}

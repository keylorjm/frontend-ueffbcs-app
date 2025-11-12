// src/app/services/calificacion.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../environments/environment';

/** Trimestres soportados */
export type Trimestre = 'T1' | 'T2' | 'T3';

/** Fila de entrada (UI 0..10) para envío en bulk */
export interface NotaTrimestreInputRow10 {
  estudianteId: string;
  /** Escala 0..10 (null si no registra) */
  promedioTrimestral: number | null;
}

/** Payload para POST /api/calificaciones/bulk-trimestre (0..10) */
export interface BulkTrimestrePayload10 {
  cursoId: string;
  anioLectivoId: string;
  materiaId: string;
  trimestre: Trimestre;
  rows: NotaTrimestreInputRow10[];
}

/** Respuesta GET /api/calificaciones (0..10) */
export interface CalificacionesGetResponse10 {
  estudiantes: Array<{
    estudianteId: string;
    estudianteNombre?: string;
    /** Escala 0..10 (puede venir null si aún no hay nota) */
    promedioTrimestral: number | null;
  }>;
}

/** (Opcional) payload para final anual (0..10) */
export interface EvaluacionFinalPayload10 {
  cursoId: string;
  anioLectivoId: string;
  estudianteId: string;
  materiaId?: string;
  evaluacionFinal?: number | null;   // 0..10
  cualitativaFinal?: string | null;
  observacionFinal?: string | null;
}

@Injectable({ providedIn: 'root' })
export class CalificacionService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/calificaciones`;

  // ============ LECTURA (UI 0..10) ============
  /**
   * Obtiene notas del trimestre (devuelve 0..10).
   * GET /api/calificaciones?cursoId=&anioLectivoId=&materiaId=&trimestre=
   */
  obtenerNotas(params: {
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

    return this.http.get<CalificacionesGetResponse10>(`${this.baseUrl}`, { params: p });
  }

  // ============ ESCRITURA (UI 0..10) ============
  /**
   * Guarda/actualiza en bloque las notas del trimestre (0..10).
   * POST /api/calificaciones/bulk-trimestre
   */
  cargarTrimestreBulk(payload10: BulkTrimestrePayload10) {
    // Aseguramos limpieza/clamp antes de enviar
    const clean = this.buildBulkPayload({
      cursoId: payload10.cursoId,
      anioLectivoId: payload10.anioLectivoId,
      materiaId: payload10.materiaId,
      trimestre: payload10.trimestre,
      tableRows: payload10.rows,
    });
    return this.http.post<any>(`${this.baseUrl}/bulk-trimestre`, clean);
  }

  /**
   * (Opcional) Guarda el final anual materializado (0..10).
   * POST /api/calificaciones/final
   */
  cargarFinal(payload10: EvaluacionFinalPayload10) {
    const body: any = {
      cursoId: payload10.cursoId,
      anioLectivoId: payload10.anioLectivoId,
      estudianteId: payload10.estudianteId,
      materiaId: payload10.materiaId,
      evaluacionFinal:
        payload10.evaluacionFinal == null ? null : this.clamp10(payload10.evaluacionFinal),
      cualitativaFinal: payload10.cualitativaFinal ?? undefined,
      observacionFinal: payload10.observacionFinal ?? undefined,
    };
    return this.http.post<any>(`${this.baseUrl}/final`, body);
  }

  // ============ HELPERS ============
  /** Normaliza/clamp a 0..10 o null */
  private clamp10(n: any): number | null {
    if (n === null || n === undefined) return null;
    const v = Number(n);
    if (Number.isNaN(v)) return null;
    return Math.max(0, Math.min(10, v));
  }

  /**
   * Construye un payload BULK (0..10) a partir de filas de UI (ya validadas).
   * Limpia NaN, clamp 0..10 y asegura tipos string en IDs.
   */
  buildBulkPayload(input: {
    cursoId: string;
    anioLectivoId: string;
    materiaId: string;
    trimestre: Trimestre;
    tableRows: Array<{
      estudianteId: string;
      promedioTrimestral: number | null | undefined; // 0..10 o null
    }>;
  }): BulkTrimestrePayload10 {
    const rows: NotaTrimestreInputRow10[] = input.tableRows.map((r) => ({
      estudianteId: String(r.estudianteId),
      promedioTrimestral: this.clamp10(r.promedioTrimestral),
    }));

    return {
      cursoId: input.cursoId,
      anioLectivoId: input.anioLectivoId,
      materiaId: input.materiaId,
      trimestre: input.trimestre,
      rows,
    };
  }

  /**
   * Calcula promedio final (0..10) a partir de T1, T2, T3 (0..10).
   * Regla: final = (T1 + T2 + T3) / 3, redondeado a 1 decimal.
   * Si falta alguna, promedia con las presentes; si todas faltan, retorna null.
   */
  promedioFinal10(
    t1: number | null | undefined,
    t2: number | null | undefined,
    t3: number | null | undefined
  ): number | null {
    const vals = [t1, t2, t3]
      .map((v) => (v == null ? null : Number(v)))
      .filter((v): v is number => typeof v === 'number' && !Number.isNaN(v));
    if (!vals.length) return null;
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    return Math.round(avg * 10) / 10;
  }

  /**
   * Cualitativa estándar desde 0..10 (ajusta rangos a tu reglamento si necesitas).
   */
  cualitativaFrom10(n0_10: number | null | undefined): string {
    if (n0_10 == null || Number.isNaN(Number(n0_10))) return 'Sin registro';
    const n = Number(n0_10);
    if (n >= 9) return 'Excelente';
    if (n >= 8) return 'Muy Bueno';
    if (n >= 7) return 'Bueno';
    if (n >= 6) return 'Regular';
    return 'Insuficiente';
  }

  // Al final de la clase CalificacionService
cargarTrimestreUna(params: {
  cursoId: string;
  anioLectivoId: string;
  materiaId: string;
  trimestre: Trimestre;
  estudianteId: string;
  promedioTrimestral: number | null;
}) {
  const payload: BulkTrimestrePayload10 = {
    cursoId: params.cursoId,
    anioLectivoId: params.anioLectivoId,
    materiaId: params.materiaId,
    trimestre: params.trimestre,
    rows: [{
      estudianteId: params.estudianteId,
      promedioTrimestral: params.promedioTrimestral
    }]
  };
  return this.cargarTrimestreBulk(payload);
}

}


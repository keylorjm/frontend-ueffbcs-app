// src/app/services/anio-lectivo.service.ts
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService } from './api.service';

/** Interfaz del Año Lectivo */
export interface AnioLectivo {
  _id?: string;
  uid?: string;
  nombre: string;      // p.ej. "2025 - 2026" o "2025"
  fechaInicio: string; // ISO "YYYY-MM-DD"
  fechaFin: string;    // ISO "YYYY-MM-DD"
  estado: boolean;
  actual?: boolean;
}

/** Respuesta backend */
interface AnioLectivoResponse {
  ok: boolean;
  total?: number;
  aniosLectivos: AnioLectivo[];
}

/** Tipos de payload aceptados (flexibles) */
type PayloadConFechas = {
  nombre: string;
  fechaInicio: string;  // ISO
  fechaFin: string;     // ISO
  estado: boolean;
  actual?: boolean;
};

type PayloadConAnios = {
  nombre: string;
  anioInicio: number;   // 2025
  anioFin: number;      // 2026
  estado: boolean;
  actual?: boolean;
};

type CreatePayload = PayloadConFechas | PayloadConAnios;
type UpdatePayload = Partial<PayloadConFechas & PayloadConAnios>;

@Injectable({ providedIn: 'root' })
export class AnioLectivoService {
  private api = inject(ApiService);
  private base = 'aniolectivo';

  /** ================= Helpers ================= */

  /** Normaliza datos de entrada a formato con fechaInicio/fechaFin ISO */
  private normalizePayload(input: CreatePayload | UpdatePayload): PayloadConFechas | Partial<PayloadConFechas> {
    const out: any = { ...input };

    const hasFechas = typeof (input as any).fechaInicio === 'string' || typeof (input as any).fechaFin === 'string';
    const hasAnios  = typeof (input as any).anioInicio === 'number' || typeof (input as any).anioFin === 'number';

    if (hasAnios && !hasFechas) {
      const ai = (input as any).anioInicio;
      const af = (input as any).anioFin;

      if (typeof ai === 'number' && !out.fechaInicio) {
        // por defecto, primer día del año
        out.fechaInicio = `${ai}-01-01`;
      }
      if (typeof af === 'number' && !out.fechaFin) {
        // por defecto, último día del año
        out.fechaFin = `${af}-12-31`;
      }

      // ya no necesitamos los campos de año
      delete out.anioInicio;
      delete out.anioFin;
    }

    return out;
  }

  /** ================= Listado / Lectura ================= */

  getAll(): Observable<AnioLectivo[]> {
    return this.api.get<AnioLectivoResponse>(this.base).pipe(
      map((r) => r.aniosLectivos ?? [])
    );
  }

  getById(id: string): Observable<AnioLectivo> {
    return this.api.get<AnioLectivo>(`${this.base}/${id}`);
  }

  obtenerActual(): Observable<AnioLectivo | null> {
    return this.api.get<{ ok: boolean; actual?: AnioLectivo }>(`${this.base}/actual`).pipe(
      map((res) => res.actual ?? null)
    );
  }

  /** ================= Escritura ================= */

  create(payload: CreatePayload): Observable<AnioLectivo> {
    const body = this.normalizePayload(payload) as PayloadConFechas;
    // Validación mínima por si alguien pasó algo raro
    if (!body.fechaInicio || !body.fechaFin) {
      throw new Error('fechaInicio y fechaFin son requeridas (puedes enviar anioInicio/ anioFin y se normalizan).');
    }
    return this.api.post<AnioLectivo>(this.base, body);
  }

  update(id: string, patch: UpdatePayload): Observable<AnioLectivo> {
    const body = this.normalizePayload(patch) as Partial<PayloadConFechas>;
    return this.api.put<AnioLectivo>(`${this.base}/${id}`, body);
  }

  delete(id: string): Observable<any> {
    return this.api.delete<any>(`${this.base}/${id}`);
  }

  setActual(id: string): Observable<AnioLectivo> {
    return this.api.put<AnioLectivo>(`${this.base}/${id}/set-actual`, {});
  }
}

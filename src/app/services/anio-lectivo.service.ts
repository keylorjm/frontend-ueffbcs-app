// src/app/services/anio-lectivo.service.ts
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService } from './api.service';

export interface AnioLectivo {
  _id: string;
  nombre: string;
  fechaInicio: string; // ISO
  fechaFin: string;    // ISO
  actual: boolean;
  activo?: boolean;
  orden?: number;      // 👈 NUEVO
}

type CreatePayload = {
  nombre: string;
  anioInicio?: number;
  anioFin?: number;
  fechaInicio?: string;
  fechaFin?: string;
  actual?: boolean;
  activo?: boolean;
  orden?: number;      // 👈 NUEVO
};

type UpdatePayload = Partial<CreatePayload>;

@Injectable({ providedIn: 'root' })
export class AnioLectivoService {
  private api = inject(ApiService);
  private base = 'aniolectivo'; // http://.../api/aniolectivo

  /** 🔹 Normaliza años numéricos a fechas ISO (y pasa orden si viene) */
  private normalizePayload(input: CreatePayload | UpdatePayload): any {
    const out: any = { ...input };

    if (input.anioInicio && !input.fechaInicio) {
      out.fechaInicio = `${input.anioInicio}-01-01`;
    }
    if (input.anioFin && !input.fechaFin) {
      out.fechaFin = `${input.anioFin}-12-31`;
    }

    delete out.anioInicio;
    delete out.anioFin;
    return out;
  }

  // ===== Lectura =====
  getAll(): Observable<AnioLectivo[]> {
    return this.api.get<{ ok: boolean; data: AnioLectivo[] }>(this.base).pipe(
      map(res => res.data ?? [])
    );
  }

  getById(id: string): Observable<AnioLectivo> {
    return this.api.get<{ ok: boolean; data: AnioLectivo }>(`${this.base}/${id}`).pipe(
      map(res => res.data)
    );
  }

  obtenerActual(): Observable<AnioLectivo | null> {
    return this.api.get<{ ok: boolean; data: AnioLectivo | null }>(`${this.base}/actual`)
      .pipe(map(res => res.data ?? null));
  }

  // ===== Escritura =====
  create(payload: CreatePayload): Observable<AnioLectivo> {
    const body = this.normalizePayload(payload);
    return this.api.post<{ ok: boolean; data: AnioLectivo }>(this.base, body).pipe(
      map(res => res.data)
    );
  }

  update(id: string, patch: UpdatePayload): Observable<AnioLectivo> {
    const body = this.normalizePayload(patch);
    return this.api.put<{ ok: boolean; data: AnioLectivo }>(`${this.base}/${id}`, body).pipe(
      map(res => res.data)
    );
  }

  delete(id: string): Observable<{ _id?: string } | AnioLectivo> {
    return this.api.delete<{ ok: boolean; data: any }>(`${this.base}/${id}`).pipe(
      map(res => res.data)
    );
  }

  setActual(id: string) {
    return this.api
      .put<{ ok: boolean; data: AnioLectivo }>(`${this.base}/${id}/actual`, {})
      .pipe(map(res => res.data));
  }
}

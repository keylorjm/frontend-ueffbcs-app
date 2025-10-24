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
  activo?: boolean;    // si tu schema lo tiene, vendrá aquí
}

type CreatePayload = {
  nombre: string;
  anioInicio?: number;
  anioFin?: number;
  fechaInicio?: string;
  fechaFin?: string;
  actual?: boolean;
  activo?: boolean;
};

type UpdatePayload = Partial<CreatePayload>;

@Injectable({ providedIn: 'root' })
export class AnioLectivoService {
  private api = inject(ApiService);
  private base = 'aniolectivo'; // http://localhost:5000/api/aniolectivo

  /** 🔹 Normaliza años numéricos a fechas ISO */
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

  /** =================== Lectura =================== */

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

  /** =================== Escritura =================== */

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
  // Usa PUT porque ya tienes ese alias en tu router
  return this.api
    .put<{ ok: boolean; data: AnioLectivo }>(`${this.base}/${id}/actual`, {})
    .pipe(map(res => res.data));
}
}

// src/app/services/matricula.service.ts
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface AutoMatricularResponse {
  ok: boolean;
  message?: string;
  already?: boolean;
  matriculaId?: string;
  anioLectivoNuevoId?: string;
  cursoNuevoId?: string;
}

export interface AutoMatricularBulkResponse {
  ok: boolean;
  message?: string;
  stats?: {
    ok: number;
    ya: number;
    noAprob: number;
    err: number;
    total: number;
  };
}

export interface MatriculaMasivaResponse {
  ok: boolean;
  msg?: string;
  asignados?: number;
  omitidos?: number;
  total?: number;
}

@Injectable({ providedIn: 'root' })
export class MatriculaService {
  private api = inject(ApiService);
  private base = 'matriculas'; // => /api/matriculas

  /**
   * 🔹 Promoción/matrícula individual al siguiente año.
   * El backend valida si el estudiante APRUEBA y si ya estaba matriculado.
   *
   * POST /api/matriculas/auto
   */
  autoMatricular(payload: {
    estudianteId: string;
    anioLectivoActualId: string;
    cursoActualId: string;
  }): Observable<AutoMatricularResponse> {
    return this.api.post<AutoMatricularResponse>(`${this.base}/auto`, payload);
  }

  /**
   * 🔹 Promoción/matrícula masiva de todos los estudiantes de un curso.
   * El backend recorre el curso y sólo promueve a los que aprueban.
   *
   * POST /api/matriculas/auto-bulk
   */
  autoMatricularBulk(payload: {
    anioLectivoId: string;
    cursoId: string;
  }): Observable<AutoMatricularBulkResponse> {
    return this.api.post<AutoMatricularBulkResponse>(
      `${this.base}/auto-bulk`,
      payload
    );
  }

  /**
   * 🔹 Matrícula masiva manual:
   * asignas un conjunto de estudiantes seleccionados a un curso + año lectivo.
   *
   * POST /api/matriculas/masiva
   */
  matriculaMasiva(payload: {
    cursoId: string;
    anioLectivoId: string;
    estudiantes: string[];
  }): Observable<MatriculaMasivaResponse> {
    return this.api.post<MatriculaMasivaResponse>(
      `${this.base}/masiva`,
      payload
    );
  }
}

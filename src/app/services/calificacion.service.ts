import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService } from './api.service';

export type Trimestre = 'T1' | 'T2' | 'T3';

/** Tipo base devuelto por backend */
export interface Calificacion {
  _id?: string;
  estudiante?: { _id?: string; uid?: string; nombre?: string };
  curso?: string | { _id?: string; nombre?: string };
  materia?: string | { _id?: string; nombre?: string };
  anioLectivo?: string | { _id?: string; nombre?: string };
  T1?: any;
  T2?: any;
  T3?: any;
  promedioTrimestralAnual?: number;
}

/** Tipo enriquecido para frontend */
export interface CalificacionRow extends Calificacion {
  estudianteId: string;
}

/** Payload para cargar notas */
export interface NotaTrimestreInput {
  estudianteId: string;
  promedioTrimestral: number;
  faltasJustificadas: number;
  faltasInjustificadas: number;
}

/** Payload de bulk save */
export interface CargarTrimestreBulkInput {
  cursoId: string;
  anioLectivoId: string;
  materiaId: string;
  trimestre: Trimestre;
  notas: NotaTrimestreInput[];
}

@Injectable({ providedIn: 'root' })
export class CalificacionService {
  private api = inject(ApiService);
  private base = 'calificaciones';

  /** ✅ Obtiene notas del backend y mapea al tipo CalificacionRow */
  obtenerNotas(params: {
    cursoId: string;
    anioLectivoId: string;
    materiaId: string;
    trimestre: Trimestre;
  }): Observable<CalificacionRow[]> {
    return this.api
      .get<Calificacion[]>(`${this.base}`, params)
      .pipe(
        map((rows) =>
          (rows ?? []).map((r) => {
            const estudianteId =
              (r.estudiante as any)?.uid ??
              (r.estudiante as any)?._id ??
              '';
            return { ...r, estudianteId };
          })
        )
      );
  }

  /** ✅ Carga masiva de notas */
  cargarTrimestreBulk(input: CargarTrimestreBulkInput): Observable<any> {
    return this.api.post(`${this.base}/bulk`, input);
  }

  /** Opcional: obtiene todas las calificaciones del curso */
  listarPorCurso(cursoId: string): Observable<CalificacionRow[]> {
    return this.api.get<Calificacion[]>(`${this.base}/curso/${cursoId}`).pipe(
      map((rows) =>
        (rows ?? []).map((r) => ({
          ...r,
          estudianteId:
            (r.estudiante as any)?.uid ??
            (r.estudiante as any)?._id ??
            '',
        }))
      )
    );
  }
}

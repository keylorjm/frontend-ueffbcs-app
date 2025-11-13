// src/app/services/curso.service.ts
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from './api.service';
import { AnioLectivo, AnioLectivoService } from './anio-lectivo.service';

export interface Curso {
  _id: string;
  anioLectivo: string | { _id: string; nombre?: string; orden?: number };
  nombre: string;
  materias?: Array<any>;
  orden?: number;                    // 👈 NUEVO
  nextCursoId?: string | null;       // 👈 NUEVO
}

@Injectable({ providedIn: 'root' })
export class CursoService {
  private api = inject(ApiService);
  private anioSrv = inject(AnioLectivoService);
  private base = 'cursos'; // => /api/cursos

  listar(): Observable<Curso[]> {
    return this.api.get<{ ok?: boolean; data?: Curso[] }>(this.base).pipe(
      map((res: any) => (Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : []))
    );
  }

  obtener(id: string): Observable<Curso> {
    return this.api.get<{ ok?: boolean; data?: Curso }>(`${this.base}/${id}`).pipe(
      map((res: any) => res?.data ?? res)
    );
  }

  crear(payload: Partial<Curso>): Observable<Curso> {
    return this.api.post<{ ok?: boolean; data?: Curso }>(this.base, payload).pipe(
      map((res: any) => res?.data ?? res)
    );
  }

  actualizar(id: string, patch: Partial<Curso>): Observable<Curso> {
    return this.api.put<{ ok?: boolean; data?: Curso }>(`${this.base}/${id}`, patch).pipe(
      map((res: any) => res?.data ?? res)
    );
  }

  eliminar(id: string): Observable<any> {
    return this.api.delete<any>(`${this.base}/${id}`);
  }

  /** Cursos de un año lectivo */
  listarPorAnio(anioId: string): Observable<Curso[]> {
    return this.listar().pipe(
      map(cursos => cursos.filter(c =>
        c?.anioLectivo === anioId ||
        (c?.anioLectivo as any)?._id === anioId
      ))
    );
  }

  /**
   * Dado un año actual, devuelve el **año siguiente** por `orden` y sus cursos.
   * Si no tienes `orden` en los años, puedes resolver por `fechaInicio` (ajústalo).
   */
  cursosDelAnioSiguiente(anioActualId: string): Observable<{ anioSiguiente: AnioLectivo | null; cursos: Curso[] }> {
    return this.anioSrv.getAll().pipe(
      map((anios) => {
        const actual = anios.find(a => a._id === anioActualId) || null;
        if (!actual) return { anioSiguiente: null, cursos: [] };
        const siguiente =
          anios.filter(a => (a.orden ?? 0) > (actual.orden ?? 0))
               .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))[0] || null;
        return { anioSiguiente: siguiente, cursos: [] };
      }),
      // luego acoplamos cursos si hay año siguiente
      // (NOTA: evitamos switchMap por mantenerlo simple aquí)
      // El caller hará otra llamada a listarPorAnio si lo necesita
    );
  }
}

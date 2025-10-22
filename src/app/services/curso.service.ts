// src/app/services/curso.service.ts
import { Injectable, inject } from '@angular/core';
import { Observable, throwError, of } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { ApiService } from './api.service';
import { Materia } from './materia.service';
import { Estudiante } from './estudiante.service';
import { AuthService } from './auth.service';

export interface ProfesorCompleto {
  _id?: string;
  uid?: string;
  nombre: string;
  apellido?: string;
  correo?: string;
}

export interface Curso {
  _id?: string;
  uid?: string;
  nombre: string;
  profesorTutor: string | ProfesorCompleto | null;
  materias: Materia[];
  estudiantes: Estudiante[];
  estado?: boolean;
}

@Injectable({ providedIn: 'root' })
export class CursoService {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private basePath = 'cursos';

  /**
   * ✅ Profesional: obtener cursos por profesor usando query param.
   *    GET /api/cursos?profesorId=<id>
   */
  getByProfesorId(profesorId: string): Observable<Curso[]> {
    if (!profesorId) return of<Curso[]>([]);
    return this.api
      .get<any>(`${this.basePath}?profesorId=${encodeURIComponent(profesorId)}`)
      .pipe(
        map(normalizeCursosArray),
        catchError((err) => {
          console.error('❌ Error en CursoService.getByProfesorId():', err);
          return of<Curso[]>([]);
        }),
      );
  }

  /**
   * (Opcional) Wrapper que usa el id del usuario autenticado si lo hay.
   * Útil en dashboards de profesor sin tener que pasar el id.
   */
  getMisCursos(): Observable<Curso[]> {
    const profId = this.auth.user?.id;
    return profId ? this.getByProfesorId(profId) : of<Curso[]>([]);
  }

  // ✅ Obtiene todos los cursos (permite filtro opcional)
  getAll(params?: { profesorId?: string }): Observable<Curso[]> {
    if (params?.profesorId) {
      return this.getByProfesorId(params.profesorId);
    }
    return this.api.get<any>(this.basePath).pipe(
      map(normalizeCursosArray),
      catchError((err) => {
        console.error('❌ Error en CursoService.getAll():', err);
        return throwError(() => err);
      }),
    );
  }

  // ✅ Obtiene un curso por ID (soporta distintas formas de respuesta)
 getById(id: string): Observable<Curso> {
  // ✅ Bloquea ids vacíos o inválidos ANTES de hacer la petición
  const ok = typeof id === 'string'
    && id !== 'null'
    && id !== 'undefined'
    && /^[0-9a-fA-F]{24}$/.test(id);    // ObjectId de 24 hex

  if (!ok) {
    return throwError(() => new Error('ID de curso inválido'));
  }

  return this.api.get<any>(`${this.basePath}/${id}`).pipe(
    tap((resp) => console.log('📦 Curso desde backend (bruto):', resp)),
    map(normalizeCursoOne(id)),
    catchError((err) => {
      console.error('❌ Error en CursoService.getById():', err);
      return throwError(() => err);
    }),
  );
}

  // ✅ Crear curso
  create(curso: Partial<Curso>): Observable<Curso> {
    return this.api.post<any>(this.basePath, curso).pipe(
      map(normalizeCursoOne()),
      catchError((err) => {
        console.error('❌ Error en CursoService.create():', err);
        return throwError(() => err);
      }),
    );
  }

  // ✅ Actualizar curso
  update(id: string, curso: Partial<Curso>): Observable<Curso> {
    return this.api.put<any>(`${this.basePath}/${id}`, curso).pipe(
      map(normalizeCursoOne(id)),
      catchError((err) => {
        console.error('❌ Error en CursoService.update():', err);
        return throwError(() => err);
      }),
    );
  }

  // ✅ Eliminar curso
  delete(id: string): Observable<any> {
    return this.api.delete<any>(`${this.basePath}/${id}`).pipe(
      catchError((err) => {
        console.error('❌ Error en CursoService.delete():', err);
        return throwError(() => err);
      }),
    );
  }
}

export type { Estudiante, Materia };

/* -------------------- Helpers de normalización -------------------- */

function normalizeCursosArray(resp: any): Curso[] {
  const arr: any[] = Array.isArray(resp)
    ? resp
    : resp?.cursos ?? resp?.data ?? resp?.results ?? [];
  return (arr as any[])
    .map(item => normalizeCursoShape(item))
    .filter(c => !!(c.uid || c._id));
}

function normalizeCursoOne(fallbackId?: string) {
  return (resp: any): Curso => {
    const raw = resp?.curso ?? resp?.data ?? resp; // soporta { ok, curso } o objeto directo
    return normalizeCursoShape(raw, fallbackId);
  };
}

function normalizeCursoShape(raw: any, fallbackId?: string): Curso {
  if (!raw || typeof raw !== 'object') {
    return {
      _id: fallbackId!,
      uid: fallbackId,
      nombre: '—',
      profesorTutor: null,
      materias: [],
      estudiantes: [],
      estado: undefined,
    } as Curso;
  }

  const id = raw?.uid ?? raw?._id ?? fallbackId;
  const materias = Array.isArray(raw?.materias) ? raw.materias : [];
  const estudiantes = Array.isArray(raw?.estudiantes) ? raw.estudiantes : [];

  let profesorTutor: string | ProfesorCompleto | null = null;
  if (raw?.profesorTutor) {
    if (typeof raw.profesorTutor === 'string') {
      profesorTutor = raw.profesorTutor;
    } else {
      profesorTutor = {
        _id: raw.profesorTutor._id ?? raw.profesorTutor.uid,
        uid: raw.profesorTutor.uid ?? raw.profesorTutor._id,
        nombre: raw.profesorTutor.nombre ?? '',
        apellido: raw.profesorTutor.apellido,
        correo: raw.profesorTutor.correo ?? raw.profesorTutor.email,
      };
    }
  }

  return {
    _id: raw?._id ?? id,
    uid: id,
    nombre: raw?.nombre ?? '—',
    profesorTutor,
    materias,
    estudiantes,
    estado: raw?.estado,
  } as Curso;
}

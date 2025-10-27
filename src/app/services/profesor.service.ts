// src/app/services/profesor.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../environments/environment';

export interface MisCursosMateriaResumen {
  cursoId: string;
  cursoNombre: string;
  anioLectivoId: string;
  anioLectivoNombre?: string;
  materias: { materiaId: string; materiaNombre: string }[];
}

export interface MisCursosMateriasResponse {
  ok: boolean;
  cursos: MisCursosMateriaResumen[];
}

@Injectable({ providedIn: 'root' })
export class ProfesorService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/profesor`;

  misCursosMaterias() {
    return this.http.get<MisCursosMateriasResponse>(`${this.baseUrl}/mis-cursos-materias`);
  }
}

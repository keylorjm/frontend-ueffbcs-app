// src/app/services/reporte.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

export interface ReporteTrimestralItem {
  estudianteId: string;
  estudianteNombre: string;
  promedioTrimestral: number;
  cualitativa?: string;
  faltasJustificadas?: number;
  faltasInjustificadas?: number;
}
export interface ReporteTrimestralResponse {
  curso: { _id: string; nombre: string };
  materia: { _id: string; nombre: string };
  anioLectivo: { _id: string; nombre: string };
  trimestre: 1|2|3;
  items: ReporteTrimestralItem[];
  fecha: string;
}

export interface ReporteAnualItem {
  estudianteId: string;
  estudianteNombre: string;
  t1?: number; t2?: number; t3?: number;
  promedioFinal?: number;
  cualitativaFinal?: string;
}
export interface ReporteAnualResponse {
  curso: { _id: string; nombre: string };
  materia: { _id: string; nombre: string };
  anioLectivo: { _id: string; nombre: string };
  items: ReporteAnualItem[];
  fecha: string;
}

@Injectable({ providedIn: 'root' })
export class ReporteService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/reportes`;

  getTrimestral(curso: string, materia: string, anioLectivo: string, trimestre: 1|2|3): Observable<ReporteTrimestralResponse> {
    const params = { curso, materia, anioLectivo, trimestre: String(trimestre) };
    return this.http.get<ReporteTrimestralResponse>(`${this.api}/trimestral`, { params });
  }

  getAnual(curso: string, materia: string, anioLectivo: string): Observable<ReporteAnualResponse> {
    const params = { curso, materia, anioLectivo };
    return this.http.get<ReporteAnualResponse>(`${this.api}/anual`, { params });
  }
}

// src/app/services/reporte.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../environments/environment';

@Injectable({ providedIn: 'root' })
export class ReporteService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/reportes`;

  getTrimestral(params: { cursoId: string; anioLectivoId: string; materiaId: string; trimestre: 'T1'|'T2'|'T3' }) {
    const p = new HttpParams()
      .set('cursoId', params.cursoId)
      .set('anioLectivoId', params.anioLectivoId)
      .set('materiaId', params.materiaId)
      .set('trimestre', params.trimestre);
    return this.http.get<any>(`${this.baseUrl}/trimestre`, { params: p });
  }

  getFinal(params: { cursoId: string; anioLectivoId: string; estudianteId: string }) {
    const p = new HttpParams()
      .set('cursoId', params.cursoId)
      .set('anioLectivoId', params.anioLectivoId)
      .set('estudianteId', params.estudianteId);
    return this.http.get<any>(`${this.baseUrl}/final`, { params: p });
  }
}

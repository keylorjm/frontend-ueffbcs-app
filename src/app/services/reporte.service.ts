import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class ReporteService {
  private api = inject(ApiService);
  private base = 'reportes';

  trimestreJSON(params: { cursoId: string; anioLectivoId: string; materiaId: string; trimestre: 'T1'|'T2'|'T3' }): Observable<any> {
    return this.api.get<any>(`${this.base}/trimestre`, params as any);
  }

  finalJSON(params: { cursoId: string; anioLectivoId: string; materiaId: string }): Observable<any> {
    return this.api.get<any>(`${this.base}/final`, params as any);
  }

  trimestrePDF(params: { cursoId: string; anioLectivoId: string; materiaId: string; trimestre: 'T1'|'T2'|'T3' }): Observable<Blob> {
    return this.api.get<Blob>(`${this.base}/trimestre/pdf`, params as any);
  }

  finalPDF(params: { cursoId: string; anioLectivoId: string; materiaId: string }): Observable<Blob> {
    return this.api.get<Blob>(`${this.base}/final/pdf`, params as any);
  }
}

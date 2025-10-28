// src/app/pages/profesor/notas-trimestrales.component.ts
import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';

import {
  CalificacionService,
  Trimestre,
  NotaTrimestreInputRow,
  BulkTrimestrePayload,
} from '../../services/calificacion.service';
import { CursoService } from '../../services/curso.service';

type RowVM = NotaTrimestreInputRow & {
  estudianteNombre: string;
  cualitativa: string;
};

@Component({
  standalone: true,
  selector: 'app-notas-trimestrales',
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatSelectModule,
    MatButtonModule,
    MatSnackBarModule,
    MatTableModule,
  ],
  template: `
  <div class="wrap">
    <mat-card class="card">
      <div class="head">
        <div>
          <h2>Registro de Notas</h2>
          <div class="sub">
            Curso: <strong>{{ cursoNombre() }}</strong>
            — Materia: <strong>{{ materiaNombre() }}</strong>
          </div>
        </div>

        <div class="controls">
          <mat-select [(ngModel)]="trimestre" (selectionChange)="cargar()">
            <mat-option [value]="'T1'">Primer Trimestre</mat-option>
            <mat-option [value]="'T2'">Segundo Trimestre</mat-option>
            <mat-option [value]="'T3'">Tercer Trimestre</mat-option>
          </mat-select>

          <button mat-flat-button color="primary"
                  (click)="guardar()"
                  [disabled]="rows.length === 0">
            Guardar
          </button>
        </div>
      </div>

      <div class="table-wrap" *ngIf="rows.length; else noData">
        <table mat-table [dataSource]="rows" class="mat-elevation-z1">
          <ng-container matColumnDef="estudiante">
            <th mat-header-cell *matHeaderCellDef>Estudiante</th>
            <td mat-cell *matCellDef="let r">{{ r.estudianteNombre }}</td>
          </ng-container>

          <ng-container matColumnDef="prom">
            <th mat-header-cell *matHeaderCellDef>Promedio</th>
            <td mat-cell *matCellDef="let r">
              <input class="inp" type="number" min="0" max="100"
                     [(ngModel)]="r.promedioTrimestral"
                     (ngModelChange)="r.cualitativa = cuali(r.promedioTrimestral)" />
            </td>
          </ng-container>

          <ng-container matColumnDef="cuali">
            <th mat-header-cell *matHeaderCellDef>Cualitativa</th>
            <td mat-cell *matCellDef="let r">
              <span class="badge"
                    [class.ok]="(r.promedioTrimestral ?? 0) >= 70"
                    [class.warn]="(r.promedioTrimestral ?? 0) < 70">
                {{ r.cualitativa }}
              </span>
            </td>
          </ng-container>

          <ng-container matColumnDef="fj">
            <th mat-header-cell *matHeaderCellDef>Faltas J.</th>
            <td mat-cell *matCellDef="let r">
              <input class="inp" type="number" min="0" [(ngModel)]="r.faltasJustificadas" />
            </td>
          </ng-container>

          <ng-container matColumnDef="fi">
            <th mat-header-cell *matHeaderCellDef>Faltas I.</th>
            <td mat-cell *matCellDef="let r">
              <input class="inp" type="number" min="0" [(ngModel)]="r.faltasInjustificadas" />
            </td>
          </ng-container>

          <ng-container matColumnDef="asis">
            <th mat-header-cell *matHeaderCellDef>Asistencia</th>
            <td mat-cell *matCellDef="let r">
              <input class="inp" type="number" min="0" [(ngModel)]="r.asistenciaTotal" />
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="cols"></tr>
          <tr mat-row *matRowDef="let row; columns: cols"></tr>
        </table>
      </div>

      <ng-template #noData>
        <div class="empty">No hay estudiantes en este curso.</div>
      </ng-template>
    </mat-card>
  </div>
  `,
  styles: [`
    .wrap { padding: 20px; max-width: 1100px; margin: auto; }
    .card { padding: 14px; border-radius: 18px; }
    .head { display:flex; align-items:center; justify-content:space-between; gap: 12px; }
    .sub { opacity: .75; }
    .controls { display:flex; gap: 10px; align-items:center; }
    .table-wrap { margin-top: 12px; overflow: auto; }
    table { width: 100%; }
    .inp { width: 110px; padding: 6px; border: 1px solid #ddd; border-radius: 8px; }
    .badge { padding: 2px 8px; border-radius: 999px; font-size: 12px; background: #eee; }
    .ok { background: #e6f5e9; }
    .warn { background: #fdecea; }
    .empty { text-align:center; opacity:.6; padding: 24px; }
  `]
})
export class NotasTrimestralesComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private sb = inject(MatSnackBar);
  private caliSrv = inject(CalificacionService);
  private cursoSrv = inject(CursoService);

  // IDs contextuales
  cursoId = '';
  anioLectivoId = '';
  materiaId = '';

  // Trimestre (T1|T2|T3). Acepta query param '1|2|3' y lo mapea.
  trimestre: Trimestre = 'T1';

  // Cabeceras
  cursoNombre = signal<string>('');
  materiaNombre = signal<string>('');

  // Tabla
  cols = ['estudiante','prom','cuali','fj','fi','asis'];
  rows: RowVM[] = [];

  ngOnInit() {
    this.route.queryParamMap.subscribe(q => {
      this.cursoId = q.get('curso') ?? '';
      this.anioLectivoId = q.get('anioLectivo') ?? '';
      this.materiaId = q.get('materia') ?? '';
      const tri = (q.get('trimestre') ?? 'T1').toUpperCase();

      // Mapea '1|2|3' -> 'T1|T2|T3' o usa directamente 'T1|T2|T3'
      this.trimestre = (['T1','T2','T3'].includes(tri) ? tri : `T${tri}`) as Trimestre;

      this.preloadNombres();
      this.cargar();
    });
  }

  /** Precarga nombres de curso/materia para header */
  preloadNombres() {
    if (!this.cursoId) return;
    this.cursoSrv.obtener(this.cursoId).subscribe({
      next: (res: any) => {
        const curso = res?.data ?? res;
        this.cursoNombre.set(curso?.nombre ?? '');
        const mat = (curso?.materias ?? []).find((m: any) => this.asId(m?.materia) === this.materiaId);
        this.materiaNombre.set(mat?.materia?.nombre ?? mat?.materia ?? '');
      },
      error: () => {} // silencioso
    });
  }

  /** Carga/Refresca notas para el trimestre seleccionado */
  cargar() {
    if (!this.cursoId || !this.anioLectivoId || !this.materiaId) {
      this.sb.open('Faltan parámetros para cargar notas', 'Cerrar', { duration: 3000 });
      return;
    }

    this.caliSrv.obtenerNotas({
      cursoId: this.cursoId,
      anioLectivoId: this.anioLectivoId,
      materiaId: this.materiaId,
      trimestre: this.trimestre,
    }).subscribe({
      next: (res) => {
        // res.estudiantes ya viene normalizado por el service
        this.rows = (res.estudiantes ?? []).map(e => ({
          estudianteId: e.estudianteId,
          estudianteNombre: e.estudianteNombre ?? '—',
          promedioTrimestral: e.promedioTrimestral ?? null,
          faltasJustificadas: e.faltasJustificadas ?? 0,
          faltasInjustificadas: e.faltasInjustificadas ?? 0,
          asistenciaTotal: e.asistenciaTotal ?? 0,
          cualitativa: this.cuali(e.promedioTrimestral ?? 0),
        }));
      },
      error: (e) => this.sb.open(e?.error?.message ?? 'No se pudieron obtener las notas', 'Cerrar', { duration: 3500 })
    });
  }

  /** Guarda todas las filas editadas como BULK del trimestre */
  guardar() {
    if (!this.rows.length) return;

    // Valida promedios (0..100 o null)
    const fueraDeRango = this.rows.some(r => {
      const n = r.promedioTrimestral;
      return n != null && (isNaN(Number(n)) || Number(n) < 0 || Number(n) > 100);
    });
    if (fueraDeRango) {
      this.sb.open('El promedio debe estar entre 0 y 100.', 'Cerrar', { duration: 3000 });
      return;
    }

    // Construye payload usando el helper del servicio (normaliza y clampa)
    const payload: BulkTrimestrePayload = this.caliSrv.buildBulkPayload({
      cursoId: this.cursoId,
      anioLectivoId: this.anioLectivoId,
      materiaId: this.materiaId,
      trimestre: this.trimestre,
      tableRows: this.rows
    });

    this.caliSrv.cargarTrimestreBulk(payload).subscribe({
      next: (r) => this.sb.open(r?.message ?? 'Notas guardadas', 'Cerrar', { duration: 2500 }),
      error: (e) => this.sb.open(e?.error?.message ?? 'Error al guardar notas', 'Cerrar', { duration: 3500 }),
    });
  }

  /** Etiqueta cualitativa (usa helper del service) */
  cuali(prom: number | null): string {
    return this.caliSrv.cualitativa(prom ?? 0);
  }

  /** Utils */
  private asId(val: any): string {
    if (!val) return '';
    if (typeof val === 'string') return val;
    if (typeof val === 'object' && val._id) return String(val._id);
    return '';
  }
}

// src/app/pages/profesor/profesor-reportes.component.ts
import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatTableModule } from '@angular/material/table';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { AuthService } from '../../services/auth.service';
import { CursoService } from '../../services/curso.service';
import { ReporteService, ReporteTrimestralResponse, ReporteAnualResponse } from '../../services/reporte.service';

type ViewType = 'trimestral' | 'anual';

@Component({
  standalone: true,
  selector: 'app-profesor-reportes',
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatSelectModule, MatInputModule, MatButtonModule, MatSnackBarModule,
    MatIconModule, MatDividerModule, MatTableModule, MatProgressBarModule
  ],
  template: `
  <div class="wrap">
    <mat-card class="card no-print">
      <div class="header">
        <div>
          <h2>📑 Reportes del Profesor</h2>
          <div class="sub">Genere reportes trimestrales o el informe anual por curso y materia.</div>
        </div>
        <div class="actions">
          <button mat-stroked-button (click)="imprimir()" [disabled]="!hayDatos()">
            <mat-icon>print</mat-icon> Imprimir
          </button>
        </div>
      </div>
      <mat-divider></mat-divider>

      <div class="filters">
        <mat-select [(ngModel)]="view" class="sel" aria-label="Tipo de reporte">
          <mat-option [value]="'trimestral'">Reporte Trimestral</mat-option>
          <mat-option [value]="'anual'">Informe Anual</mat-option>
        </mat-select>

        <mat-select [(ngModel)]="cursoId" class="sel" placeholder="Curso" (selectionChange)="onCursoChange()">
          <mat-option *ngFor="let c of cursos()" [value]="c._id">{{ c.nombre }}</mat-option>
        </mat-select>

        <mat-select [(ngModel)]="materiaId" class="sel" placeholder="Materia">
          <mat-option *ngFor="let m of materiasDelCursoSeleccionado()" [value]="m.materiaId">
            {{ m.materiaNombre }}
          </mat-option>
        </mat-select>

        <mat-select *ngIf="view==='trimestral'" [(ngModel)]="trimestre" class="sel" placeholder="Trimestre">
          <mat-option [value]="1">1er Trimestre</mat-option>
          <mat-option [value]="2">2do Trimestre</mat-option>
          <mat-option [value]="3">3er Trimestre</mat-option>
        </mat-select>

        <button mat-flat-button color="primary" (click)="cargar()">
          <mat-icon>search</mat-icon> Cargar
        </button>
      </div>
    </mat-card>

    <!-- Trimestral -->
    <mat-card class="print-card" *ngIf="view==='trimestral' && dataT() as dT">
      <div class="rep-head">
        <div class="title">Reporte Trimestral</div>
        <div class="meta">
          <span><strong>Curso:</strong> {{ dT.curso.nombre }}</span>
          <span><strong>Materia:</strong> {{ dT.materia.nombre }}</span>
          <span><strong>Año:</strong> {{ dT.anioLectivo.nombre }}</span>
          <span><strong>Trimestre:</strong> {{ dT.trimestre }}</span>
          <span><strong>Fecha:</strong> {{ dT.fecha | date:'mediumDate' }}</span>
        </div>
      </div>

      <div class="table-wrap">
        <table mat-table [dataSource]="dT.items" class="mat-elevation-z1 print-table">
          <ng-container matColumnDef="n">
            <th mat-header-cell *matHeaderCellDef>#</th>
            <td mat-cell *matCellDef="let r; let i = index">{{ i+1 }}</td>
          </ng-container>

          <ng-container matColumnDef="est">
            <th mat-header-cell *matHeaderCellDef>Estudiante</th>
            <td mat-cell *matCellDef="let r">{{ r.estudianteNombre }}</td>
          </ng-container>

          <ng-container matColumnDef="prom">
            <th mat-header-cell *matHeaderCellDef>Promedio</th>
            <td mat-cell *matCellDef="let r">{{ r.promedioTrimestral }}</td>
          </ng-container>

          <ng-container matColumnDef="cuali">
            <th mat-header-cell *matHeaderCellDef>Cualitativa</th>
            <td mat-cell *matCellDef="let r">{{ r.cualitativa }}</td>
          </ng-container>

          <ng-container matColumnDef="fj">
            <th mat-header-cell *matHeaderCellDef>Faltas J.</th>
            <td mat-cell *matCellDef="let r">{{ r.faltasJustificadas ?? 0 }}</td>
          </ng-container>

          <ng-container matColumnDef="fi">
            <th mat-header-cell *matHeaderCellDef>Faltas I.</th>
            <td mat-cell *matCellDef="let r">{{ r.faltasInjustificadas ?? 0 }}</td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="colsT"></tr>
          <tr mat-row *matRowDef="let row; columns: colsT"></tr>
        </table>
      </div>
    </mat-card>

    <!-- Anual -->
    <mat-card class="print-card" *ngIf="view==='anual' && dataA() as dA">
      <div class="rep-head">
        <div class="title">Informe Final Anual</div>
        <div class="meta">
          <span><strong>Curso:</strong> {{ dA.curso.nombre }}</span>
          <span><strong>Materia:</strong> {{ dA.materia.nombre }}</span>
          <span><strong>Año:</strong> {{ dA.anioLectivo.nombre }}</span>
          <span><strong>Fecha:</strong> {{ dA.fecha | date:'mediumDate' }}</span>
        </div>
      </div>

      <div class="table-wrap">
        <table mat-table [dataSource]="dA.items" class="mat-elevation-z1 print-table">
          <ng-container matColumnDef="n">
            <th mat-header-cell *matHeaderCellDef>#</th>
            <td mat-cell *matCellDef="let r; let i = index">{{ i+1 }}</td>
          </ng-container>

          <ng-container matColumnDef="est">
            <th mat-header-cell *matHeaderCellDef>Estudiante</th>
            <td mat-cell *matCellDef="let r">{{ r.estudianteNombre }}</td>
          </ng-container>

          <ng-container matColumnDef="t1">
            <th mat-header-cell *matHeaderCellDef>T1</th>
            <td mat-cell *matCellDef="let r">{{ safeScore(r.t1) }}</td>
          </ng-container>
          <ng-container matColumnDef="t2">
            <th mat-header-cell *matHeaderCellDef>T2</th>
            <td mat-cell *matCellDef="let r">{{ safeScore(r.t2) }}</td>
          </ng-container>
          <ng-container matColumnDef="t3">
            <th mat-header-cell *matHeaderCellDef>T3</th>
            <td mat-cell *matCellDef="let r">{{ safeScore(r.t3) }}</td>
          </ng-container>
          <ng-container matColumnDef="pf">
            <th mat-header-cell *matHeaderCellDef>Promedio</th>
            <td mat-cell *matCellDef="let r">{{ safeScore(r.promedioFinal) }}</td>
          </ng-container>
          <ng-container matColumnDef="cf">
            <th mat-header-cell *matHeaderCellDef>Cualitativa</th>
            <td mat-cell *matCellDef="let r">{{ r.cualitativaFinal || cuali(r.promedioFinal ?? 0) }}</td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="colsA"></tr>
          <tr mat-row *matRowDef="let row; columns: colsA"></tr>
        </table>
      </div>
    </mat-card>
  </div>
  `,
  styles: [`
    .wrap { padding: 20px; max-width: 1100px; margin: auto; display: grid; gap: 14px; }
    .card { padding: 14px; border-radius: 18px; }
    .header { display:flex; align-items:center; justify-content:space-between; }
    .sub { opacity: .75; }
    .filters { display:flex; flex-wrap: wrap; gap: 10px; padding-top: 10px; }
    .sel { min-width: 220px; }
    .print-card { padding: 16px; border-radius: 18px; }
    .rep-head { display:grid; gap: 4px; }
    .title { font-weight: 800; font-size: 18px; }
    .meta { display:flex; flex-wrap: wrap; gap: 12px; opacity: .85; }
    .table-wrap { margin-top: 10px; overflow: auto; }
    .print-table { width: 100%; }

    @media print {
      .no-print, .no-print * { display: none !important; }
      body { background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .print-card { box-shadow: none !important; border: 0 !important; padding: 0; }
      .wrap { padding: 0; max-width: 100%; }
      .rep-head { margin-bottom: 8px; }
      table { page-break-inside: auto; }
      tr { page-break-inside: avoid; page-break-after: auto; }
    }
  `]
})
export class ProfesorReportesComponent implements OnInit {
  private sb = inject(MatSnackBar);
  private auth = inject(AuthService);
  private cursoSvc = inject(CursoService);
  private repSvc = inject(ReporteService);

  view: ViewType = 'trimestral';
  cursoId = '';
  materiaId = '';
  anioLectivoId = '';
  trimestre: 1|2|3 = 1;

  cursos = signal<any[]>([]);
  dataT = signal<ReporteTrimestralResponse | null>(null);
  dataA = signal<ReporteAnualResponse | null>(null);

  colsT = ['n','est','prom','cuali','fj','fi'];
  colsA = ['n','est','t1','t2','t3','pf','cf'];

  ngOnInit(): void {
    this.auth.ensureUserLoaded().subscribe(() => {
      const me = this.auth.getuser()?.id ?? '';
      this.cursoSvc.listar().subscribe({
        next: (res: any) => {
          const all = res?.data ?? res ?? [];
          // Solo cursos donde el profesor es responsable en alguna materia
          this.cursos.set(
            all.filter((c: any) => (c.materias ?? []).some((m: any) => this.asId(m?.profesor) === me))
          );
        },
        error: () => this.sb.open('No se pudieron cargar los cursos', 'Cerrar', { duration: 3000 })
      });
    });
  }

  cursosDelProfesor() { return this.cursos(); }

  materiasDelCursoSeleccionado() {
    const me = this.auth.getuser()?.id ?? '';
    const curso = (this.cursos() ?? []).find(c => this.asId(c?._id) === this.cursoId);
    const mats = (curso?.materias ?? [])
      .filter((m: any) => this.asId(m?.profesor) === me)
      .map((m: any) => ({
        materiaId: this.asId(m?.materia),
        materiaNombre: m?.materia?.nombre ?? m?.materia ?? '—',
      }));
    this.anioLectivoId = this.asId(curso?.anioLectivo);
    return mats;
  }

  onCursoChange() { this.materiaId = ''; }

  cargar() {
    if (!this.cursoId || !this.materiaId || !this.anioLectivoId) {
      this.sb.open('Selecciona Curso, Materia y Año lectivo.', 'Cerrar', { duration: 3000 });
      return;
    }
    if (this.view === 'trimestral') {
      this.repSvc.getTrimestral(this.cursoId, this.materiaId, this.anioLectivoId, this.trimestre).subscribe({
        next: (res) => { this.dataA.set(null); this.dataT.set(res); },
        error: (e) => this.sb.open(e?.error?.message ?? 'No se pudo cargar el reporte', 'Cerrar', { duration: 3500 })
      });
    } else {
      this.repSvc.getAnual(this.cursoId, this.materiaId, this.anioLectivoId).subscribe({
        next: (res) => { this.dataT.set(null); this.dataA.set(res); },
        error: (e) => this.sb.open(e?.error?.message ?? 'No se pudo cargar el informe anual', 'Cerrar', { duration: 3500 })
      });
    }
  }

  imprimir() {
    if (!this.hayDatos()) {
      this.sb.open('No hay datos para imprimir', 'Cerrar', { duration: 2500 });
      return;
    }
    window.print();
  }

  hayDatos(): boolean { return !!(this.dataT() || this.dataA()); }

  cuali(prom?: number): string {
    const p = Number(prom ?? 0);
    if (p >= 90) return 'Excelente';
    if (p >= 80) return 'Muy Bueno';
    if (p >= 70) return 'Bueno';
    if (p >= 60) return 'Regular';
    return 'Insuficiente';
  }
  safeScore(v?: number) { return typeof v === 'number' ? v : '—'; }
  private asId(val: any): string {
    if (!val) return '';
    if (typeof val === 'string') return val;
    if (typeof val === 'object' && val._id) return String(val._id);
    return '';
  }
}

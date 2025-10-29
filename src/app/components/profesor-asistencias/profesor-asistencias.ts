// src/app/components/profesor-asistencias-curso/profesor-asistencias-curso.ts
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatTableModule } from '@angular/material/table';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';

import { AuthService } from '../../services/auth.service';
import { CursoService } from '../../services/curso.service';
import { AsistenciaService, Trimestre, GuardarFaltasBulkPayload } from '../../services/asistencia.service';

type MateriaAsignada = { materiaId: string; materiaNombre: string };

type RowVM = {
  estudianteId: string;
  estudianteNombre: string;
  fj: number; // faltas justificadas
  fi: number; // faltas injustificadas
};

@Component({
  standalone: true,
  selector: 'app-profesor-asistencias-curso',
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatSelectModule, MatFormFieldModule, MatInputModule, MatButtonModule,
    MatSnackBarModule, MatIconModule, MatDividerModule, MatTableModule,
    MatProgressBarModule, MatTooltipModule, MatChipsModule
  ],
  template: `
  <div class="wrap">
    <mat-card class="card">
      <div class="header">
        <div class="title-block">
          <div class="eyebrow"><mat-icon>assignment_turned_in</mat-icon> Registro de asistencias</div>
          <h2 class="title">Faltas por Curso (Trimestrales)</h2>
          <p class="sub">Ingrese <b>Días Laborables</b> del trimestre y las <b>Faltas</b> por estudiante.</p>
        </div>
        <div class="actions">
          <button mat-stroked-button (click)="recargar()" [disabled]="cargando()">
            <mat-icon>refresh</mat-icon> Recargar
          </button>
          <button mat-flat-button color="primary" (click)="guardar()" [disabled]="guardando() || !rows().length">
            <mat-icon>save</mat-icon> {{ guardando() ? 'Guardando…' : 'Guardar' }}
          </button>
        </div>
      </div>

      <mat-divider class="soft-divider"></mat-divider>

      <!-- Filtros -->
      <div class="filters">
        <mat-form-field appearance="outline" class="ff dense">
          <mat-label>Curso</mat-label>
          <mat-select [(ngModel)]="cursoId" name="cursoId" (selectionChange)="onCursoChange()" required>
            <mat-option *ngFor="let c of cursos()" [value]="asId(c._id)">{{ c.nombre }}</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field *ngIf="materiasAsignadas().length > 1" appearance="outline" class="ff dense">
          <mat-label>Materia</mat-label>
          <mat-select [(ngModel)]="materiaId" name="materiaId" (selectionChange)="cargarTabla()" required>
            <mat-option *ngFor="let m of materiasAsignadas()" [value]="m.materiaId">{{ m.materiaNombre }}</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" class="ff dense">
          <mat-label>Trimestre</mat-label>
          <mat-select [(ngModel)]="trimestre" name="trimestre" (selectionChange)="cargarTabla()" required>
            <mat-option [value]="'T1'">Primer Trimestre</mat-option>
            <mat-option [value]="'T2'">Segundo Trimestre</mat-option>
            <mat-option [value]="'T3'">Tercer Trimestre</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" class="ff dense">
          <mat-label>Días laborables del trimestre</mat-label>
          <input matInput type="number" min="0" [(ngModel)]="diasLaborables" name="diasLaborables" placeholder="Ej: 45" />
        </mat-form-field>

        <div class="ids" *ngIf="showIds && cursoDetalle()">
          <mat-chip-set>
            <mat-chip appearance="outlined" color="primary">cursoId={{cursoId}}</mat-chip>
            <mat-chip appearance="outlined">anioId={{ anioLectivoId() }}</mat-chip>
            <mat-chip appearance="outlined">materiaId={{ materiaId || materiasAsignadas()[0]?.materiaId }}</mat-chip>
          </mat-chip-set>
        </div>
        <button mat-button class="toggle" (click)="showIds = !showIds">
          <mat-icon>bug_report</mat-icon> {{ showIds ? 'Ocultar IDs' : 'Ver IDs' }}
        </button>
      </div>

      <mat-progress-bar *ngIf="cargando()" mode="indeterminate"></mat-progress-bar>

      <!-- Tabla -->
      <div class="table-wrap" *ngIf="rows().length; else noRows">
        <table mat-table [dataSource]="rows()" class="modern-table compact mat-elevation-z1">
          <!-- # -->
          <ng-container matColumnDef="n">
            <th mat-header-cell *matHeaderCellDef class="sticky center">#</th>
            <td mat-cell *matCellDef="let r; let i = index" class="muted center">{{ i + 1 }}</td>
          </ng-container>

          <!-- Estudiante -->
          <ng-container matColumnDef="est">
            <th mat-header-cell *matHeaderCellDef class="sticky">Estudiante</th>
            <td mat-cell *matCellDef="let r">
              <div class="student-cell">
                <div class="avatar">{{ r.estudianteNombre?.[0] || 'E' }}</div>
                <div class="student-name" [matTooltip]="r.estudianteNombre">{{ r.estudianteNombre }}</div>
              </div>
            </td>
          </ng-container>

          <!-- FJ -->
          <ng-container matColumnDef="fj">
            <th mat-header-cell *matHeaderCellDef class="sticky center">FJ</th>
            <td mat-cell *matCellDef="let r" class="center">
              <mat-form-field appearance="outline" class="cell-ff dense">
                <input matInput type="number" min="0" [(ngModel)]="r.fj" (ngModelChange)="clampNonNeg(r, 'fj')" />
              </mat-form-field>
            </td>
          </ng-container>

          <!-- FI -->
          <ng-container matColumnDef="fi">
            <th mat-header-cell *matHeaderCellDef class="sticky center">FI</th>
            <td mat-cell *matCellDef="let r" class="center">
              <mat-form-field appearance="outline" class="cell-ff dense">
                <input matInput type="number" min="0" [(ngModel)]="r.fi" (ngModelChange)="clampNonNeg(r, 'fi')" />
              </mat-form-field>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="cols"></tr>
          <tr mat-row *matRowDef="let row; columns: cols" class="row"></tr>
        </table>

        <div class="footer-actions">
          <button mat-stroked-button (click)="recargar()"><mat-icon>refresh</mat-icon> Recargar</button>
          <button mat-flat-button color="primary" (click)="guardar()" [disabled]="guardando()"><mat-icon>save</mat-icon> Guardar</button>
        </div>
      </div>

      <ng-template #noRows>
        <div class="empty">
          <div class="empty-icon">📋</div>
          <div class="empty-title">No hay estudiantes cargados</div>
          <div class="empty-sub">Seleccione <b>Curso</b>, (si aplica) <b>Materia</b> y <b>Trimestre</b>.</div>
        </div>
      </ng-template>
    </mat-card>
  </div>
  `,
  styles: [`
    .wrap { padding: 16px; max-width: 1100px; margin: 0 auto; }
    .card { padding: 16px; border-radius: 16px; display: grid; gap: 12px; }
    .header { display: grid; grid-template-columns: 1fr auto; gap: 10px; align-items: center; }
    .eyebrow { display: inline-flex; gap: 6px; align-items: center; font-size: 12px; opacity: .8; }
    .title { margin: 0; font-size: 20px; font-weight: 700; }
    .sub { margin: 0; opacity: .8; font-size: 12.5px; }
    .actions { display: inline-flex; gap: 8px; align-items: center; }
    .soft-divider { opacity: .45; }

    .filters { display: grid; grid-template-columns: repeat(4, minmax(220px, 1fr)); gap: 10px; align-items: end; }
    .ff { width: 100%; }
    .dense .mat-mdc-form-field-infix { padding-top: 6px !important; padding-bottom: 6px !important; }
    .ids { grid-column: 1/-1; }
    .toggle { justify-self: start; margin-top: -6px; }

    .table-wrap { margin-top: 4px; overflow: auto; border-radius: 12px; border: 1px solid #EAEAEA; }
    table { width: 100%; font-size: 13px; }
    .modern-table th { background: #F9FAFB; font-weight: 600; color: #2f2f2f; }
    .modern-table th, .modern-table td { padding: 6px 10px; }
    .center { text-align: center; }
    .muted { opacity: .7; }
    .student-cell { display: flex; align-items: center; gap: 8px; min-width: 200px; }
    .avatar { width: 24px; height: 24px; border-radius: 50%; display: grid; place-items: center; background: #EEF2FF; font-weight: 700; font-size: 11px; }

    .cell-ff { width: 100px; }
    .cell-ff .mat-mdc-form-field-infix { padding-top: 0 !important; padding-bottom: 0 !important; }

    .footer-actions { display: flex; justify-content: flex-end; gap: 8px; padding: 10px; }
    .empty { padding: 28px 14px; text-align: center; color: #555; }
    .empty-icon { font-size: 40px; }
    .empty-title { font-weight: 700; }

    @media (max-width: 1200px) { .filters { grid-template-columns: repeat(3, minmax(220px, 1fr)); } }
    @media (max-width: 900px)  { .filters { grid-template-columns: 1fr 1fr; } }
    @media (max-width: 600px)  { .filters { grid-template-columns: 1fr; } .cell-ff { width: 90px; } }
  `]
})
export class ProfesorAsistenciasCursoComponent implements OnInit {
  private sb = inject(MatSnackBar);
  private auth = inject(AuthService);
  private cursoSrv = inject(CursoService);
  private asisSrv = inject(AsistenciaService);

  // Estado base
  cursos = signal<any[]>([]);
  cursoId = '';
  materiaId = '';
  trimestre: Trimestre = 'T1';
  cursoDetalle = signal<any | null>(null);

  // UI
  cargando = signal<boolean>(false);
  guardando = signal<boolean>(false);
  showIds = false;

  // Tabla
  cols: string[] = ['n','est','fj','fi'];
  rows = signal<RowVM[]>([]);
  diasLaborables: number | null = null;

  // ===== Ciclo =====
  ngOnInit(): void {
    this.auth.ensureUserLoaded().subscribe(() => {
      const me = this.auth.getuser()?.id ?? '';
      this.cursoSrv.listar().subscribe({
        next: (res: any) => {
          const all = res?.data ?? res ?? [];
          const mios = all.filter((c: any) =>
            (c.materias ?? []).some((m: any) => this.asId(m?.profesor) === me)
          );
          this.cursos.set(mios);
          if (mios.length === 1) {
            this.cursoId = this.asId(mios[0]._id);
            this.onCursoChange();
          }
        },
        error: () => this.sb.open('No se pudieron cargar los cursos', 'Cerrar', { duration: 3000 })
      });
    });
  }

  // ===== Derivados =====
  cursoSel = computed(() => (this.cursos() ?? []).find(c => this.asId(c._id) === this.cursoId));
  anioLectivoId = computed(() => this.asId(this.cursoDetalle()?.anioLectivo || this.cursoSel()?.anioLectivo));

  materiasAsignadas = computed<MateriaAsignada[]>(() => {
    const me = this.auth.getuser()?.id ?? '';
    return (this.cursoDetalle()?.materias ?? this.cursoSel()?.materias ?? [])
      .filter((m: any) => this.asId(m?.profesor) === me)
      .map((m: any) => ({
        materiaId: this.asId(m?.materia),
        materiaNombre: m?.materia?.nombre ?? m?.materia ?? '—'
      }));
  });

  // ===== Eventos =====
  onCursoChange(): void {
    this.cursoDetalle.set(null);
    this.rows.set([]);
    this.materiaId = '';
    this.diasLaborables = null;
    if (!this.cursoId) return;

    this.cargando.set(true);
    this.cursoSrv.obtener(this.cursoId).subscribe({
      next: (res: any) => {
        const c = res?.data ?? res ?? null;
        this.cursoDetalle.set(c);
        const mats = this.materiasAsignadas();
        this.materiaId = mats.length === 1 ? mats[0].materiaId : '';
        this.cargarTabla();
        this.cargando.set(false);
      },
      error: () => { this.cargando.set(false); this.sb.open('No se pudo cargar el detalle del curso', 'Cerrar', { duration: 3000 }); }
    });
  }

  recargar(): void {
    if (!this.cursoId) return;
    this.onCursoChange();
  }

  // ===== Carga de tabla y prefills =====
  cargarTabla(): void {
    this.rows.set([]);
    this.diasLaborables = null;
    if (!this.cursoDetalle() || !this.trimestre) return;
    if (this.materiasAsignadas().length > 1 && !this.materiaId) return;

    const estudiantes: any[] = this.cursoDetalle()?.estudiantes ?? [];
    const base: RowVM[] = (estudiantes ?? [])
      .map((e: any): RowVM => ({
        estudianteId: this.pickId(e),
        estudianteNombre: this.pickName(e),
        fj: 0,
        fi: 0
      }))
      .sort((a: RowVM, b: RowVM) => a.estudianteNombre.localeCompare(b.estudianteNombre));

    if (!base.length) { this.rows.set([]); return; }

    const cursoId = this.asId(this.cursoDetalle()?._id);
    const anioId = this.anioLectivoId();
    const materiaId = this.materiaId || this.materiasAsignadas()[0]?.materiaId || '';

    if (!cursoId || !anioId || !materiaId) {
      this.rows.set(base);
      this.sb.open('IDs incompletos (curso/año/materia).', 'Cerrar', { duration: 2500 });
      return;
    }

    this.cargando.set(true);

    // 1) Días laborables
    this.asisSrv.getDiasLaborables({ cursoId, anioLectivoId: anioId, materiaId, trimestre: this.trimestre })
      .subscribe({
        next: (d) => this.diasLaborables = (typeof d?.diasLaborables === 'number') ? d.diasLaborables : null,
        error: () => this.diasLaborables = null
      });

    // 2) Faltas existentes
    this.asisSrv.obtenerFaltas({ cursoId, anioLectivoId: anioId, materiaId, trimestre: this.trimestre })
      .subscribe({
        next: (res) => {
          const idx = new Map<string, { fj: number; fi: number }>();
          for (const it of (res?.estudiantes ?? [])) {
            const sid = this.pickId(it?.estudianteId);
            const fj = Number(it?.faltasJustificadas ?? 0) || 0;
            const fi = Number(it?.faltasInjustificadas ?? 0) || 0;
            if (sid) idx.set(sid, { fj, fi });
          }
          const merged = base.map((r: RowVM) => {
            const prev = idx.get(r.estudianteId);
            return { ...r, fj: prev?.fj ?? 0, fi: prev?.fi ?? 0 };
          });
          this.rows.set(merged);
          this.cargando.set(false);
        },
        error: () => { this.rows.set(base); this.cargando.set(false); }
      });
  }

  // ===== Guardar =====
  guardar(): void {
    const cursoId = this.asId(this.cursoDetalle()?._id);
    const anioId = this.anioLectivoId();
    const materiaId = this.materiaId || this.materiasAsignadas()[0]?.materiaId || '';

    if (!cursoId || !anioId || !materiaId || !this.trimestre) {
      this.sb.open('Faltan datos: curso, materia o trimestre', 'Cerrar', { duration: 3000 });
      return;
    }
    if (!this.rows().length) {
      this.sb.open('No hay estudiantes para guardar', 'Cerrar', { duration: 2500 });
      return;
    }
    if (this.diasLaborables == null || this.diasLaborables < 0) {
      this.sb.open('Ingrese días laborables (>= 0).', 'Cerrar', { duration: 3000 });
      return;
    }

    // Sanitizar faltas (>= 0)
    for (const r of this.rows()) {
      r.fj = Math.max(0, Number(r.fj) || 0);
      r.fi = Math.max(0, Number(r.fi) || 0);
    }

    const payload: GuardarFaltasBulkPayload = {
      cursoId, anioLectivoId: anioId, materiaId, trimestre: this.trimestre,
      rows: this.rows().map((r: RowVM) => ({
        estudianteId: r.estudianteId,
        faltasJustificadas: r.fj,
        faltasInjustificadas: r.fi
      }))
    };

    this.guardando.set(true);

    // Secuencia: set laborables -> guardar faltas
    this.asisSrv.setDiasLaborables({
      cursoId, anioLectivoId: anioId, materiaId, trimestre: this.trimestre,
      diasLaborables: Number(this.diasLaborables)
    }).subscribe({
      next: () => {
        this.asisSrv.guardarFaltasBulk(payload).subscribe({
          next: (r) => {
            this.guardando.set(false);
            this.sb.open(r?.message ?? 'Asistencias guardadas', 'Cerrar', { duration: 2500 });
            this.cargarTabla();
          },
          error: (e) => {
            this.guardando.set(false);
            this.sb.open(e?.error?.message ?? 'Error al guardar faltas', 'Cerrar', { duration: 3500 });
          }
        });
      },
      error: (e) => {
        this.guardando.set(false);
        this.sb.open(e?.error?.message ?? 'Error al guardar días laborables', 'Cerrar', { duration: 3500 });
      }
    });
  }

  // ===== Helpers =====
  clampNonNeg(r: RowVM, field: 'fj' | 'fi') {
    const v = Number(r[field]);
    r[field] = isNaN(v) ? 0 : Math.max(0, v);
  }

  asId(val: any): string {
    if (!val) return '';
    if (typeof val === 'string') return val;
    if (typeof val === 'object' && (val as any)._id) return String((val as any)._id);
    return String(val);
  }

  private pickId(val: any): string {
    if (!val) return '';
    if (typeof val === 'string') return val;
    if (typeof val === 'object') {
      if (val._id || val.id || val.uid) return String(val._id ?? val.id ?? val.uid);
      const nested = val.estudiante ?? val.alumno ?? val.usuario ?? val.user ?? val.persona;
      if (nested) return this.pickId(nested);
    }
    return '';
  }

  private pickName(val: any): string {
    if (!val) return '—';
    if (typeof val === 'string') return val;
    const tryName = (o: any) => o?.nombre ?? o?.fullname ?? o?.email ?? null;
    let n = tryName(val);
    if (n) return String(n);
    const nested = val.estudiante ?? val.alumno ?? val.usuario ?? val.user ?? val.persona;
    n = tryName(nested);
    return n ? String(n) : '—';
  }
}

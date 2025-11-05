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
import { AsistenciaService, Trimestre } from '../../services/asistencia.service';

type MateriaAsignada = { materiaId: string; materiaNombre: string };

type TriResumen = {
  diasLaborables: number | null;
  fj: number | null;
  fi: number | null;
  asistidos: number | null;  // diasLaborables - fi
};

type RowVM = {
  estudianteId: string;
  estudianteNombre: string;
  T1: TriResumen;
  T2: TriResumen;
  T3: TriResumen;
};

@Component({
  standalone: true,
  selector: 'app-profesor-asistencias-resumen',
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatSelectModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatSnackBarModule, MatIconModule, MatDividerModule,
    MatTableModule, MatProgressBarModule, MatTooltipModule, MatChipsModule,
  ],
  template: `
  <div class="wrap">
    <mat-card class="card">
      <!-- Header -->
      <div class="header">
        <div class="title-block">
          <div class="eyebrow"><mat-icon>event_available</mat-icon> Vista de asistencias</div>
          <h2 class="title">Resumen de Asistencias por Curso</h2>
          <p class="sub">Se muestran Días Laborables, FJ, FI y Asistidos por trimestre (T1, T2, T3).</p>
        </div>
        <div class="actions">
          <button mat-stroked-button (click)="recargar()" [disabled]="cargando()">
            <mat-icon>refresh</mat-icon> Recargar
          </button>
        </div>
      </div>

      <mat-divider class="soft-divider"></mat-divider>

      <!-- Filtros -->
      <div class="filters">
        <mat-form-field appearance="outline" class="ff dense">
          <mat-label>Curso</mat-label>
          <mat-select [(ngModel)]="cursoId" name="cursoId" (selectionChange)="onCursoChange()">
            <mat-option *ngFor="let c of cursos()" [value]="asId(c._id)">{{ c.nombre }}</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field *ngIf="materiasAsignadas().length > 1" appearance="outline" class="ff dense">
          <mat-label>Materia</mat-label>
          <mat-select [(ngModel)]="materiaId" name="materiaId" (selectionChange)="cargarTabla()">
            <mat-option *ngFor="let m of materiasAsignadas()" [value]="m.materiaId">{{ m.materiaNombre }}</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" class="ff dense search">
          <mat-label>Buscar estudiante</mat-label>
          <input matInput [(ngModel)]="q" (ngModelChange)="onSearchChange()" placeholder="Escriba un nombre…" />
          <button *ngIf="q()" matSuffix mat-icon-button aria-label="Limpiar" (click)="clearSearch()">
            <mat-icon>close</mat-icon>
          </button>
          <mat-icon matPrefix>search</mat-icon>
        </mat-form-field>
      </div>

      <div class="badges" *ngIf="cursoDetalle()">
        <mat-chip-set>
          <mat-chip appearance="outlined" color="primary">Año: {{ cursoDetalle()?.anioLectivo?.nombre ?? cursoDetalle()?.anioLectivo }}</mat-chip>
          <mat-chip appearance="outlined">Tutor: {{ cursoDetalle()?.profesorTutor?.nombre ?? cursoDetalle()?.profesorTutor }}</mat-chip>
          <mat-chip appearance="outlined">{{ (cursoDetalle()?.estudiantes?.length || 0) }} estudiantes</mat-chip>
          <mat-chip appearance="outlined" *ngIf="showIds">cursoId={{cursoId}}</mat-chip>
          <mat-chip appearance="outlined" *ngIf="showIds">anioId={{ anioLectivoId() }}</mat-chip>
          <mat-chip appearance="outlined" *ngIf="showIds">materiaId={{ materiaId || materiasAsignadas()[0]?.materiaId }}</mat-chip>
        </mat-chip-set>
        <button mat-button color="primary" class="toggle" (click)="showIds = !showIds">
          <mat-icon>bug_report</mat-icon> {{ showIds ? 'Ocultar IDs' : 'Ver IDs' }}
        </button>
      </div>

      <mat-progress-bar *ngIf="cargando()" mode="indeterminate"></mat-progress-bar>

      <!-- Tabla -->
      <div class="table-wrap" *ngIf="viewRows().length; else noRows">
        <table mat-table [dataSource]="viewRows()" class="modern-table compact mat-elevation-z1">
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

          <!-- Trimestres -->
          <ng-container matColumnDef="t1">
            <th mat-header-cell *matHeaderCellDef class="sticky center">T1</th>
            <td mat-cell *matCellDef="let r" class="center">
              <div class="tri">
                <span class="chip">Lab: {{ show(r.T1.diasLaborables) }}</span>
                <span class="chip">FJ: {{ show(r.T1.fj) }}</span>
                <span class="chip">FI: {{ show(r.T1.fi) }}</span>
                <span class="chip strong">Asist: {{ show(r.T1.asistidos) }}</span>
              </div>
            </td>
          </ng-container>

          <ng-container matColumnDef="t2">
            <th mat-header-cell *matHeaderCellDef class="sticky center">T2</th>
            <td mat-cell *matCellDef="let r" class="center">
              <div class="tri">
                <span class="chip">Lab: {{ show(r.T2.diasLaborables) }}</span>
                <span class="chip">FJ: {{ show(r.T2.fj) }}</span>
                <span class="chip">FI: {{ show(r.T2.fi) }}</span>
                <span class="chip strong">Asist: {{ show(r.T2.asistidos) }}</span>
              </div>
            </td>
          </ng-container>

          <ng-container matColumnDef="t3">
            <th mat-header-cell *matHeaderCellDef class="sticky center">T3</th>
            <td mat-cell *matCellDef="let r" class="center">
              <div class="tri">
                <span class="chip">Lab: {{ show(r.T3.diasLaborables) }}</span>
                <span class="chip">FJ: {{ show(r.T3.fj) }}</span>
                <span class="chip">FI: {{ show(r.T3.fi) }}</span>
                <span class="chip strong">Asist: {{ show(r.T3.asistidos) }}</span>
              </div>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="cols"></tr>
          <tr mat-row *matRowDef="let row; columns: cols" class="row"></tr>
        </table>
      </div>

      <ng-template #noRows>
        <div class="empty">
          <div class="empty-icon">🗓️</div>
          <div class="empty-title">No hay datos para mostrar</div>
          <div class="empty-sub">Seleccione <b>Curso</b> y (si aplica) <b>Materia</b>, luego presione <i>Recargar</i>.</div>
        </div>
      </ng-template>
    </mat-card>
  </div>
  `,
  styles: [`
    .wrap { padding: 16px; max-width: 1100px; margin: 0 auto; }
    .card { padding: 16px; border-radius: 16px; display: grid; gap: 12px; }

    .header { display: grid; grid-template-columns: 1fr auto; gap: 10px; align-items: center; }
    .eyebrow { display: inline-flex; gap: 6px; align-items: center; font-size: 12px; letter-spacing: .3px; opacity: .8; }
    .title { margin: 0; font-size: 20px; font-weight: 700; }
    .sub { margin: 0; opacity: .8; font-size: 12.5px; }

    .filters { display: grid; grid-template-columns: repeat(3, minmax(220px, 1fr)); gap: 10px; align-items: end; }
    .ff { width: 100%; }
    .dense .mat-mdc-form-field-infix { padding-top: 6px !important; padding-bottom: 6px !important; }

    .table-wrap { margin-top: 6px; overflow: auto; border-radius: 12px; border: 1px solid #EAEAEA; }
    table { width: 100%; font-size: 13px; }
    .modern-table th { background: #F9FAFB; font-weight: 600; color: #2f2f2f; }
    .modern-table th, .modern-table td { padding: 6px 10px; }
    .center { text-align: center; }
    .muted { opacity: .7; }

    .student-cell { display: flex; align-items: center; gap: 8px; min-width: 200px; }
    .avatar { width: 24px; height: 24px; border-radius: 50%; display: grid; place-items: center; background: #EEF2FF; font-weight: 700; font-size: 11px; }

    .tri { display: inline-flex; gap: 6px; flex-wrap: wrap; justify-content: center; }
    .chip { display: inline-block; padding: 2px 8px; border-radius: 10px; background: #EEE; font-variant-numeric: tabular-nums; }
    .chip.strong { font-weight: 700; background: #EAF5FF; }
    .badges { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .toggle { margin-top: 6px; }

    .empty { padding: 28px 14px; text-align: center; color: #555; }
    .empty-icon { font-size: 40px; }
    .empty-title { font-weight: 700; }

    @media (max-width: 900px) {
      .filters { grid-template-columns: 1fr 1fr; }
    }
    @media (max-width: 600px) {
      .filters { grid-template-columns: 1fr; }
      .header { grid-template-columns: 1fr; }
    }
  `]
})
export class ProfesorAsistenciasResumenComponent implements OnInit {
  private sb = inject(MatSnackBar);
  private auth = inject(AuthService);
  private cursoSrv = inject(CursoService);
  private asisSrv = inject(AsistenciaService);

  cursos = signal<any[]>([]);
  cursoId = '';
  materiaId = '';
  cursoDetalle = signal<any | null>(null);
  cargando = signal<boolean>(false);

  cols = ['n','est','t1','t2','t3'];
  rows = signal<RowVM[]>([]);
  q = signal<string>('');
  showIds = false;

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

  filteredRows = computed<RowVM[]>(() => {
    const term = (this.q() || '').trim().toLowerCase();
    if (!term) return this.rows();
    return this.rows().filter((r: RowVM) => (r.estudianteNombre || '').toLowerCase().includes(term));
  });
  viewRows = computed(() => this.filteredRows());

  // ===== Eventos =====
  onCursoChange(): void {
    this.cursoDetalle.set(null);
    this.rows.set([]);
    this.materiaId = '';
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

  onSearchChange(): void {}
  clearSearch(): void { this.q.set(''); }

  // ===== Normalizadores robustos =====
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

  private buildTri(dias: number | null, fj: number | null, fi: number | null): TriResumen {
    const asistidos = (dias != null && fi != null) ? Math.max(0, dias - fi) : null;
    return { diasLaborables: dias, fj, fi, asistidos };
    // Nota: estamos siguiendo tu regla: asistidos = laborables - faltas INJUSTIFICADAS
  }

  // ===== Carga de tabla =====
  cargarTabla(): void {
    this.rows.set([]);
    if (!this.cursoDetalle()) return;

    const mats = this.materiasAsignadas();
    if (mats.length > 1 && !this.materiaId) {
      this.sb.open('Seleccione una materia asignada.', 'Cerrar', { duration: 2500 });
      return;
    }

    // Base estudiantes
    const estudiantes: any[] = this.cursoDetalle()?.estudiantes ?? [];
    const base: RowVM[] = (estudiantes ?? [])
      .map((e: any): RowVM => ({
        estudianteId: this.pickId(e),
        estudianteNombre: this.pickName(e),
        T1: { diasLaborables: null, fj: null, fi: null, asistidos: null },
        T2: { diasLaborables: null, fj: null, fi: null, asistidos: null },
        T3: { diasLaborables: null, fj: null, fi: null, asistidos: null }
      }))
      .sort((a: RowVM, b: RowVM) => a.estudianteNombre.localeCompare(b.estudianteNombre));

    if (!base.length) { this.rows.set([]); return; }

    const cursoId = this.asId(this.cursoDetalle()?._id);
    const anioId = this.anioLectivoId();
    const materiaId = this.materiaId || mats[0]?.materiaId || '';

    if (!cursoId || !anioId || !materiaId) {
      this.rows.set(base);
      this.sb.open('IDs incompletos (curso/año/materia).', 'Cerrar', { duration: 2500 });
      return;
    }

    this.cargando.set(true);

    const loadPorTrimestre = (tri: Trimestre) => new Promise<{
      diasLaborables: number | null;
      faltasIdx: Map<string, { fj: number; fi: number }>;
    }>((resolve) => {
      // 1) días laborables del curso/materia/trimestre
      this.asisSrv.getDiasLaborables({ cursoId, anioLectivoId: anioId, materiaId, trimestre: tri })
        .subscribe({
          next: (d) => {
            const diasLab = (typeof d?.diasLaborables === 'number') ? d.diasLaborables : null;

            // 2) faltas por estudiante
            this.asisSrv.obtenerFaltas({ cursoId, anioLectivoId: anioId, materiaId, trimestre: tri })
              .subscribe({
                next: (res) => {
                  const idx = new Map<string, { fj: number; fi: number }>();
                  const arr: any[] = res?.estudiantes ?? res ?? [];
                  for (const it of arr) {
                    const sid = this.pickId(it?.estudianteId ?? it?.estudiante);
                    const fj = Number(it?.faltasJustificadas ?? 0) || 0;
                    const fi = Number(it?.faltasInjustificadas ?? 0) || 0;
                    if (sid) idx.set(sid, { fj, fi });
                  }
                  resolve({ diasLaborables: diasLab, faltasIdx: idx });
                },
                error: (_e) => resolve({ diasLaborables: diasLab, faltasIdx: new Map() })
              });
          },
          error: (_e) => resolve({ diasLaborables: null, faltasIdx: new Map() })
        });
    });

    Promise.all([loadPorTrimestre('T1'), loadPorTrimestre('T2'), loadPorTrimestre('T3')])
      .then(([t1, t2, t3]) => {
        const merged = base.map((r: RowVM) => {
          const sid = r.estudianteId;

          const a1 = t1.faltasIdx.get(sid) ?? { fj: 0, fi: 0 };
          const a2 = t2.faltasIdx.get(sid) ?? { fj: 0, fi: 0 };
          const a3 = t3.faltasIdx.get(sid) ?? { fj: 0, fi: 0 };

          return {
            ...r,
            T1: this.buildTri(t1.diasLaborables, a1.fj, a1.fi),
            T2: this.buildTri(t2.diasLaborables, a2.fj, a2.fi),
            T3: this.buildTri(t3.diasLaborables, a3.fj, a3.fi),
          };
        });

        this.rows.set(merged);
        this.cargando.set(false);
      })
      .catch((e) => {
        console.error('[AsistenciasResumen] Error Promise.all:', e);
        this.rows.set(base);
        this.cargando.set(false);
      });
  }

  // ===== Helpers UI =====
  show(n: number | null): string { return n == null ? '—' : String(n); }

  // ===== Helper genérico =====
  asId(val: any): string {
    if (!val) return '';
    if (typeof val === 'string') return val;
    if (typeof val === 'object' && (val as any)._id) return String((val as any)._id);
    return String(val);
  }
}

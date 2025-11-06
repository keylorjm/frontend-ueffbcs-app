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
import {
  AsistenciaService,
  Trimestre,
  GuardarFaltasBulkPayload,
} from '../../services/asistencia.service';

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
    CommonModule,
    FormsModule,
    MatCardModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSnackBarModule,
    MatIconModule,
    MatDividerModule,
    MatTableModule,
    MatProgressBarModule,
    MatTooltipModule,
    MatChipsModule,
  ],
  template: `
    <div class="wrap">
      <mat-card class="card">
        <!-- Header -->
        <div class="header">
          <div class="header-left">
            <div class="icon-bubble"><mat-icon>assignment_turned_in</mat-icon></div>
            <div class="title-block">
              <h1 class="title">Faltas por Curso <span class="badge">Trimestrales</span></h1>
              <p class="sub">
                Ingrese <b>Días laborables</b> del trimestre y registre las <b>faltas</b> por
                estudiante.
              </p>
            </div>
          </div>
          <div class="actions">
            <button
              mat-stroked-button
              class="btn-soft"
              (click)="recargar()"
              [disabled]="cargando()"
            >
              <mat-icon>refresh</mat-icon>
              <span>Recargar</span>
            </button>
            <button
              mat-flat-button
              color="primary"
              class="btn-primary"
              (click)="guardar()"
              [disabled]="guardando() || !rows().length"
            >
              <mat-icon>save</mat-icon>
              <span>{{ guardando() ? 'Guardando…' : 'Guardar' }}</span>
            </button>
          </div>
        </div>

        <mat-divider class="soft-divider"></mat-divider>

        <!-- Filtros -->
        <div class="filters">
          <mat-form-field appearance="outline" class="ff dense">
            <mat-label>Curso</mat-label>
            <mat-select
              [(ngModel)]="cursoId"
              name="cursoId"
              (selectionChange)="onCursoChange()"
              required
            >
              <mat-option *ngFor="let c of cursos()" [value]="asId(c._id)">{{
                c.nombre
              }}</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field
            *ngIf="materiasAsignadas().length > 1"
            appearance="outline"
            class="ff dense"
          >
            <mat-label>Materia</mat-label>
            <mat-select
              [(ngModel)]="materiaId"
              name="materiaId"
              (selectionChange)="cargarTabla()"
              required
            >
              <mat-option *ngFor="let m of materiasAsignadas()" [value]="m.materiaId">{{
                m.materiaNombre
              }}</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline" class="ff dense">
            <mat-label>Trimestre</mat-label>
            <mat-select
              [(ngModel)]="trimestre"
              name="trimestre"
              (selectionChange)="cargarTabla()"
              required
            >
              <mat-option [value]="'T1'">Primer Trimestre</mat-option>
              <mat-option [value]="'T2'">Segundo Trimestre</mat-option>
              <mat-option [value]="'T3'">Tercer Trimestre</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline" class="ff dense">
            <mat-label>Días laborables del trimestre</mat-label>
            <input
              matInput
              type="number"
              min="0"
              [(ngModel)]="diasLaborables"
              name="diasLaborables"
              placeholder="Ej: 45"
            />
            <button
              matSuffix
              mat-icon-button
              class="suffix-help"
              matTooltip="Total de días de clase planificados para el trimestre."
            >
              <mat-icon>help_outline</mat-icon>
            </button>
          </mat-form-field>

          <div class="ids" *ngIf="showIds && cursoDetalle()">
            <mat-chip-set>
              <mat-chip appearance="outlined" color="primary">cursoId={{ cursoId }}</mat-chip>
              <mat-chip appearance="outlined">anioId={{ anioLectivoId() }}</mat-chip>
              <mat-chip appearance="outlined"
                >materiaId={{ materiaId || materiasAsignadas()[0]?.materiaId }}</mat-chip
              >
            </mat-chip-set>
          </div>
        </div>

        <mat-progress-bar *ngIf="cargando()" mode="indeterminate"></mat-progress-bar>

        <!-- Tabla -->
        <div class="table-wrap" *ngIf="rows().length; else noRows">
          <table mat-table [dataSource]="rows()" class="modern-table compact mat-elevation-z1">
            <!-- # -->
            <ng-container matColumnDef="n">
              <th mat-header-cell *matHeaderCellDef class="center">#</th>
              <td mat-cell *matCellDef="let r; let i = index" class="muted center">{{ i + 1 }}</td>
            </ng-container>

            <!-- Estudiante -->
            <ng-container matColumnDef="est">
              <th mat-header-cell *matHeaderCellDef>Estudiante</th>
              <td mat-cell *matCellDef="let r">
                <div class="student-cell">
                  <div class="avatar" [attr.aria-label]="r.estudianteNombre">
                    {{ r.estudianteNombre?.[0] || 'E' }}
                  </div>
                  <div class="student-name" [matTooltip]="r.estudianteNombre">
                    {{ r.estudianteNombre }}
                  </div>
                </div>
              </td>
            </ng-container>

            <!-- FJ -->
            <ng-container matColumnDef="fj">
              <th mat-header-cell *matHeaderCellDef class="center">
                FJ
                <span class="th-sub">Justificadas</span>
              </th>
              <td mat-cell *matCellDef="let r" class="center">
                <mat-form-field appearance="outline" class="cell-ff dense">
                  <input
                    matInput
                    type="number"
                    min="0"
                    [(ngModel)]="r.fj"
                    (ngModelChange)="clampNonNeg(r, 'fj')"
                  />
                </mat-form-field>
              </td>
            </ng-container>

            <!-- FI -->
            <ng-container matColumnDef="fi">
              <th mat-header-cell *matHeaderCellDef class="center">
                FI
                <span class="th-sub">Injustificadas</span>
              </th>
              <td mat-cell *matCellDef="let r" class="center">
                <mat-form-field appearance="outline" class="cell-ff dense">
                  <input
                    matInput
                    type="number"
                    min="0"
                    [(ngModel)]="r.fi"
                    (ngModelChange)="clampNonNeg(r, 'fi')"
                  />
                </mat-form-field>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="cols" class="sticky-head"></tr>
            <tr mat-row *matRowDef="let row; columns: cols" class="row"></tr>
          </table>

          <div class="footer-actions">
            <div class="hint-left" *ngIf="diasLaborables != null">
              <mat-icon inline>event</mat-icon>
              <span>{{ diasLaborables }} días laborables establecidos para {{ trimestre }}</span>
            </div>
            <div class="cta">
              <button mat-stroked-button class="btn-soft" (click)="recargar()">
                <mat-icon>refresh</mat-icon>
                <span>Recargar</span>
              </button>
              <button
                mat-flat-button
                color="primary"
                class="btn-primary"
                (click)="guardar()"
                [disabled]="guardando()"
              >
                <mat-icon>save</mat-icon>
                <span>Guardar</span>
              </button>
            </div>
          </div>
        </div>

        <ng-template #noRows>
          <div class="empty">
            <div class="empty-emoji" aria-hidden>📋</div>
            <div class="empty-title">No hay estudiantes cargados</div>
            <div class="empty-sub">
              Seleccione <b>Curso</b>, (si aplica) <b>Materia</b> y <b>Trimestre</b>.
            </div>
          </div>
        </ng-template>
      </mat-card>
    </div>
  `,
  styles: [
    `
      /* ===== Design tokens (soft/compact) ===== */
      :host {
        --card-radius: 20px;
        --input-radius: 10px;
        --btn-radius: 14px;
        --surface: #ffffff;
        --border: #e5e7eb;
        --muted: #6b7280;
        --soft: #f7f7fb;
        --header-grad: linear-gradient(180deg, #f8fafc 0%, #ffffff 100%);
      }

      .wrap {
        padding: 16px;
        max-width: 1100px;
        margin: 0 auto;
      }
      .card {
        padding: 18px;
        border-radius: var(--card-radius);
        background: var(--surface);
        border: 1px solid var(--border);
        box-shadow: 0 8px 20px rgba(17, 24, 39, 0.04);
        display: grid;
        gap: 14px;
      }

      /* ===== Header ===== */
      .header {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 12px;
        align-items: center;
        background: var(--header-grad);
        border-radius: 16px;
        padding: 10px 12px;
      }
      .header-left {
        display: grid;
        grid-auto-flow: column;
        align-items: center;
        gap: 12px;
      }
      .icon-bubble {
        width: 40px;
        height: 40px;
        border-radius: 12px;
        display: grid;
        place-items: center;
        background: #e8efff;
        color: #1e40af;
        box-shadow: inset 0 -1px 0 rgba(30, 64, 175, 0.08);
      }
      .title {
        margin: 0;
        font-size: 22px;
        font-weight: 800;
        letter-spacing: -0.01em;
      }
      .sub {
        margin: 0;
        color: var(--muted);
        font-size: 13px;
      }
      .badge {
        font-size: 11px;
        font-weight: 700;
        color: #1e3a8a;
        background: #e8efff;
        padding: 3px 8px;
        border-radius: 999px;
        margin-left: 6px;
      }

      .actions {
        display: inline-flex;
        gap: 8px;
        align-items: center;
      }
      .btn-primary {
        border-radius: var(--btn-radius);
        height: 40px;
        font-weight: 700;
        box-shadow: 0 6px 14px rgba(59, 130, 246, 0.18);
      }
      .btn-soft {
        border-radius: var(--btn-radius);
        height: 40px;
      }
      .actions .mat-icon,
      .cta .mat-icon {
        margin-right: 6px;
      }

      .soft-divider {
        opacity: 0.5;
      }

      /* ===== Filtros ===== */
      .filters {
        display: grid;
        grid-template-columns: repeat(4, minmax(220px, 1fr));
        gap: 12px;
        align-items: end;
      }
      .ff {
        width: 100%;
      }
      .dense .mat-mdc-form-field-infix {
        padding-top: 6px !important;
        padding-bottom: 6px !important;
      }
      .suffix-help {
        opacity: 0.75;
      }
      .ids {
        grid-column: 1/-1;
      }

      /* ===== Tabla ===== */
      .table-wrap {
        margin-top: 6px;
        overflow: auto;
        border-radius: 14px;
        border: 1px solid var(--border);
        background: #fff;
      }
      table {
        width: 100%;
        font-size: 13px;
        border-collapse: separate;
        border-spacing: 0;
      }
      .modern-table th {
        position: sticky;
        top: 0;
        background: var(--soft);
        font-weight: 700;
        color: #111827;
        z-index: 1;
      }
      .modern-table th,
      .modern-table td {
        padding: 8px 12px;
      }
      .modern-table tr.row:hover td {
        background: #fafafa;
      }
      .center {
        text-align: center;
      }
      .muted {
        color: var(--muted);
      }
      .student-cell {
        display: flex;
        align-items: center;
        gap: 10px;
        min-width: 220px;
      }
      .avatar {
        width: 28px;
        height: 28px;
        border-radius: 999px;
        display: grid;
        place-items: center;
        background: #eef2ff;
        color: #1e40af;
        font-weight: 800;
        font-size: 12px;
        border: 1px solid #e5e7eb;
      }

      .th-sub {
        display: block;
        font-size: 10px;
        font-weight: 600;
        color: var(--muted);
        margin-top: 2px;
      }

      .cell-ff {
        width: 110px;
      }
      .cell-ff .mat-mdc-form-field-infix {
        padding-top: 0 !important;
        padding-bottom: 0 !important;
      }

      /* Sticky header shadow */
      .sticky-head::after {
        content: '';
        position: sticky;
        left: 0;
        right: 0;
        bottom: -1px;
        height: 1px;
        background: var(--border);
        display: block;
      }

      /* ===== Footer actions ===== */
      .footer-actions {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 8px;
        align-items: center;
        padding: 10px;
        border-top: 1px solid var(--border);
        background: #fff;
        border-bottom-left-radius: 14px;
        border-bottom-right-radius: 14px;
      }
      .hint-left {
        font-size: 12px;
        color: var(--muted);
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }
      .cta {
        display: inline-flex;
        gap: 8px;
      }

      /* ===== Empty state ===== */
      .empty {
        padding: 44px 14px;
        text-align: center;
        color: #4b5563;
        background: #fff;
        border: 1px dashed var(--border);
        border-radius: 14px;
      }
      .empty-emoji {
        font-size: 42px;
        margin-bottom: 6px;
      }
      .empty-title {
        font-weight: 800;
        margin-bottom: 4px;
      }

      /* ===== Responsive ===== */
      @media (max-width: 1200px) {
        .filters {
          grid-template-columns: repeat(3, minmax(220px, 1fr));
        }
      }
      @media (max-width: 900px) {
        .filters {
          grid-template-columns: 1fr 1fr;
        }
        .title {
          font-size: 20px;
        }
      }
      @media (max-width: 600px) {
        .filters {
          grid-template-columns: 1fr;
        }
        .cell-ff {
          width: 90px;
        }
        .actions {
          justify-self: end;
        }
      }
    `,
  ],
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
  cols: string[] = ['n', 'est', 'fj', 'fi'];
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
        error: () => this.sb.open('No se pudieron cargar los cursos', 'Cerrar', { duration: 3000 }),
      });
    });
  }

  // ===== Derivados =====
  cursoSel = computed(() => (this.cursos() ?? []).find((c) => this.asId(c._id) === this.cursoId));
  anioLectivoId = computed(() =>
    this.asId(this.cursoDetalle()?.anioLectivo || this.cursoSel()?.anioLectivo)
  );

  materiasAsignadas = computed<MateriaAsignada[]>(() => {
    const me = this.auth.getuser()?.id ?? '';
    return (this.cursoDetalle()?.materias ?? this.cursoSel()?.materias ?? [])
      .filter((m: any) => this.asId(m?.profesor) === me)
      .map((m: any) => ({
        materiaId: this.asId(m?.materia),
        materiaNombre: m?.materia?.nombre ?? m?.materia ?? '—',
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
      error: () => {
        this.cargando.set(false);
        this.sb.open('No se pudo cargar el detalle del curso', 'Cerrar', { duration: 3000 });
      },
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
      .map(
        (e: any): RowVM => ({
          estudianteId: this.pickId(e),
          estudianteNombre: this.pickName(e),
          fj: 0,
          fi: 0,
        })
      )
      .sort((a: RowVM, b: RowVM) => a.estudianteNombre.localeCompare(b.estudianteNombre));

    if (!base.length) {
      this.rows.set([]);
      return;
    }

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
    this.asisSrv
      .getDiasLaborables({ cursoId, anioLectivoId: anioId, materiaId, trimestre: this.trimestre })
      .subscribe({
        next: (d) =>
          (this.diasLaborables = typeof d?.diasLaborables === 'number' ? d.diasLaborables : null),
        error: () => (this.diasLaborables = null),
      });

    // 2) Faltas existentes
    this.asisSrv
      .obtenerFaltas({ cursoId, anioLectivoId: anioId, materiaId, trimestre: this.trimestre })
      .subscribe({
        next: (res) => {
          const idx = new Map<string, { fj: number; fi: number }>();
          for (const it of res?.estudiantes ?? []) {
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
        error: () => {
          this.rows.set(base);
          this.cargando.set(false);
        },
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
      cursoId,
      anioLectivoId: anioId,
      materiaId,
      trimestre: this.trimestre,
      rows: this.rows().map((r: RowVM) => ({
        estudianteId: r.estudianteId,
        faltasJustificadas: r.fj,
        faltasInjustificadas: r.fi,
      })),
    };

    this.guardando.set(true);

    // Secuencia: set laborables -> guardar faltas
    this.asisSrv
      .setDiasLaborables({
        cursoId,
        anioLectivoId: anioId,
        materiaId,
        trimestre: this.trimestre,
        diasLaborables: Number(this.diasLaborables),
      })
      .subscribe({
        next: () => {
          this.asisSrv.guardarFaltasBulk(payload).subscribe({
            next: (r) => {
              this.guardando.set(false);
              this.sb.open(r?.message ?? 'Asistencias guardadas', 'Cerrar', { duration: 2500 });
              this.cargarTabla();
            },
            error: (e) => {
              this.guardando.set(false);
              this.sb.open(e?.error?.message ?? 'Error al guardar faltas', 'Cerrar', {
                duration: 3500,
              });
            },
          });
        },
        error: (e) => {
          this.guardando.set(false);
          this.sb.open(e?.error?.message ?? 'Error al guardar días laborables', 'Cerrar', {
            duration: 3500,
          });
        },
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

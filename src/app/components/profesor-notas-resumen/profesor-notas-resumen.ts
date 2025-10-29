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
import { CalificacionService, Trimestre } from '../../services/calificacion.service';

type MateriaAsignada = { materiaId: string; materiaNombre: string };

type RowVM = {
  estudianteId: string;
  estudianteNombre: string;
  t1: number | null;
  t2: number | null;
  t3: number | null;
  final: number | null;
};

@Component({
  standalone: true,
  selector: 'app-profesor-notas-resumen',
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
          <div class="title-block">
            <div class="eyebrow"><mat-icon>insights</mat-icon> Vista de calificaciones</div>
            <h2 class="title">Resumen de Notas por Curso</h2>
            <p class="sub">Se muestran T1, T2, T3 y el promedio final (0–10).</p>
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
            <mat-select [(ngModel)]="materiaId" name="materiaId" (selectionChange)="cargarTabla()">
              <mat-option *ngFor="let m of materiasAsignadas()" [value]="m.materiaId">{{
                m.materiaNombre
              }}</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline" class="ff dense search">
            <mat-label>Buscar estudiante</mat-label>
            <input
              matInput
              [(ngModel)]="q"
              (ngModelChange)="onSearchChange()"
              placeholder="Escriba un nombre…"
            />
            <button
              *ngIf="q()"
              matSuffix
              mat-icon-button
              aria-label="Limpiar"
              (click)="clearSearch()"
            >
              <mat-icon>close</mat-icon>
            </button>
            <mat-icon matPrefix>search</mat-icon>
          </mat-form-field>
        </div>

        <div class="badges" *ngIf="cursoDetalle()">
          <mat-chip-set>
            <mat-chip appearance="outlined" color="primary"
              >Año:
              {{ cursoDetalle()?.anioLectivo?.nombre ?? cursoDetalle()?.anioLectivo }}</mat-chip
            >
            <mat-chip appearance="outlined"
              >Tutor:
              {{ cursoDetalle()?.profesorTutor?.nombre ?? cursoDetalle()?.profesorTutor }}</mat-chip
            >
            <mat-chip appearance="outlined"
              >{{ cursoDetalle()?.estudiantes?.length || 0 }} estudiantes</mat-chip
            >
            <mat-chip appearance="outlined" *ngIf="showIds">cursoId={{ cursoId }}</mat-chip>
            <mat-chip appearance="outlined" *ngIf="showIds">anioId={{ anioLectivoId() }}</mat-chip>
            <mat-chip appearance="outlined" *ngIf="showIds"
              >materiaId={{ materiaId || materiasAsignadas()[0]?.materiaId }}</mat-chip
            >
          </mat-chip-set>
          <button mat-button color="primary" class="toggle" (click)="showIds = !showIds">
            <mat-icon>bug_report</mat-icon> {{ showIds ? 'Ocultar IDs' : 'Ver IDs' }}
          </button>
        </div>

        <mat-progress-bar *ngIf="cargando()" mode="indeterminate"></mat-progress-bar>

        <!-- Tabla -->
        <div class="table-wrap" *ngIf="viewRows().length; else noRows">
          <table mat-table [dataSource]="viewRows()" class="modern-table compact mat-elevation-z1">
            <ng-container matColumnDef="n">
              <th mat-header-cell *matHeaderCellDef class="sticky center">#</th>
              <td mat-cell *matCellDef="let r; let i = index" class="muted center">{{ i + 1 }}</td>
            </ng-container>

            <ng-container matColumnDef="est">
              <th mat-header-cell *matHeaderCellDef class="sticky">Estudiante</th>
              <td mat-cell *matCellDef="let r">
                <div class="student-cell">
                  <div class="avatar">{{ r.estudianteNombre?.[0] || 'E' }}</div>
                  <div class="student-name" [matTooltip]="r.estudianteNombre">
                    {{ r.estudianteNombre }}
                  </div>
                </div>
              </td>
            </ng-container>

            <ng-container matColumnDef="t1">
              <th mat-header-cell *matHeaderCellDef class="sticky center">T1</th>
              <td mat-cell *matCellDef="let r" class="center">
                <span class="pill" [class.good]="isOK(r.t1)" [class.bad]="isBad(r.t1)">{{
                  fmt(r.t1)
                }}</span>
              </td>
            </ng-container>

            <ng-container matColumnDef="t2">
              <th mat-header-cell *matHeaderCellDef class="sticky center">T2</th>
              <td mat-cell *matCellDef="let r" class="center">
                <span class="pill" [class.good]="isOK(r.t2)" [class.bad]="isBad(r.t2)">{{
                  fmt(r.t2)
                }}</span>
              </td>
            </ng-container>

            <ng-container matColumnDef="t3">
              <th mat-header-cell *matHeaderCellDef class="sticky center">T3</th>
              <td mat-cell *matCellDef="let r" class="center">
                <span class="pill" [class.good]="isOK(r.t3)" [class.bad]="isBad(r.t3)">{{
                  fmt(r.t3)
                }}</span>
              </td>
            </ng-container>

            <ng-container matColumnDef="final">
              <th mat-header-cell *matHeaderCellDef class="sticky center">Final</th>
              <td mat-cell *matCellDef="let r" class="center">
                <span
                  class="pill final"
                  [class.good]="isOK(r.final)"
                  [class.bad]="isBad(r.final)"
                  >{{ fmt(r.final) }}</span
                >
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="cols"></tr>
            <tr mat-row *matRowDef="let row; columns: cols" class="row"></tr>
          </table>
        </div>

        <ng-template #noRows>
          <div class="empty">
            <div class="empty-icon">📋</div>
            <div class="empty-title">No hay datos para mostrar</div>
            <div class="empty-sub">
              Seleccione <b>Curso</b> y (si aplica) <b>Materia</b>, luego presione <i>Recargar</i>.
            </div>
          </div>
        </ng-template>
      </mat-card>
    </div>
  `,
  styles: [
    `
      .wrap {
        padding: 16px;
        max-width: 1100px;
        margin: 0 auto;
      }
      .card {
        padding: 16px;
        border-radius: 16px;
        display: grid;
        gap: 12px;
      }
      .header {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 10px;
        align-items: center;
      }
      .eyebrow {
        display: inline-flex;
        gap: 6px;
        align-items: center;
        font-size: 12px;
        letter-spacing: 0.3px;
        opacity: 0.8;
      }
      .title {
        margin: 0;
        font-size: 20px;
        font-weight: 700;
      }
      .sub {
        margin: 0;
        opacity: 0.8;
        font-size: 12.5px;
      }
      .filters {
        display: grid;
        grid-template-columns: repeat(3, minmax(220px, 1fr));
        gap: 10px;
        align-items: end;
      }
      .ff {
        width: 100%;
      }
      .dense .mat-mdc-form-field-infix {
        padding-top: 6px !important;
        padding-bottom: 6px !important;
      }
      .toggle {
        margin-top: 6px;
      }
      .table-wrap {
        margin-top: 6px;
        overflow: auto;
        border-radius: 12px;
        border: 1px solid #eaeaea;
      }
      table {
        width: 100%;
        font-size: 13px;
      }
      .modern-table th {
        background: #f9fafb;
        font-weight: 600;
        color: #2f2f2f;
      }
      .modern-table th,
      .modern-table td {
        padding: 6px 10px;
      }
      .student-cell {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 200px;
      }
      .avatar {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        display: grid;
        place-items: center;
        background: #eef2ff;
        font-weight: 700;
        font-size: 11px;
      }
      .pill {
        display: inline-block;
        min-width: 44px;
        padding: 2px 8px;
        border-radius: 10px;
        background: #eee;
      }
      .pill.good {
        background: #e6f5e9;
      }
      .pill.bad {
        background: #fdecea;
      }
      .pill.final {
        font-weight: 700;
      }
      .center {
        text-align: center;
      }
      .empty {
        padding: 28px 14px;
        text-align: center;
        color: #555;
      }
    `,
  ],
})
export class ProfesorNotasResumenComponent implements OnInit {
  private sb = inject(MatSnackBar);
  private auth = inject(AuthService);
  private cursoSrv = inject(CursoService);
  private caliSrv = inject(CalificacionService);

  cursos = signal<any[]>([]);
  cursoId = '';
  materiaId = '';
  cursoDetalle = signal<any | null>(null);
  cargando = signal<boolean>(false);

  cols = ['n', 'est', 't1', 't2', 't3', 'final'];
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

  filteredRows = computed<RowVM[]>(() => {
    const term = (this.q() || '').trim().toLowerCase();
    if (!term) return this.rows();
    return this.rows().filter((r: RowVM) =>
      (r.estudianteNombre || '').toLowerCase().includes(term)
    );
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

  onSearchChange(): void {}
  clearSearch(): void {
    this.q.set('');
  }

  // ===== Normalizadores robustos =====
  /** Obtiene un id string desde string | {_id|id|uid} | objeto anidado (estudiante|alumno|usuario|user) */
  private pickId(val: any): string {
    if (!val) return '';
    if (typeof val === 'string') return val;
    if (typeof val === 'object') {
      // directo
      if (val._id || val.id || val.uid) return String(val._id ?? val.id ?? val.uid);
      // anidados comunes
      const nested = val.estudiante ?? val.alumno ?? val.usuario ?? val.user ?? val.persona;
      if (nested) return this.pickId(nested);
    }
    return '';
  }

  /** Obtiene nombre legible desde objeto (o sus anidados comunes) */
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

  /** Nota 0–10 desde distintos nombres y escalas (si viniera 0–100 lo normaliza) */
  private notaFrom(item: any): number | null {
    // nombres posibles en tu backend
    const raw =
      item?.promedio10 ?? item?.promedio ?? item?.promedioTrimestral ?? item?.nota ?? null;
    if (raw == null) return null;
    const v = Number(raw);
    if (isNaN(v)) return null;
    // si detectamos que es > 10, asumimos escala 0–100 y convertimos
    return v > 10 ? Number((v / 10).toFixed(2)) : Number(v.toFixed(2));
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

    // Construcción base con normalización fuerte
    const estudiantes: any[] = this.cursoDetalle()?.estudiantes ?? [];
    const base: RowVM[] = (estudiantes ?? [])
      .map(
        (e: any): RowVM => ({
          estudianteId: this.pickId(e), // <- ahora nunca será [object Object]
          estudianteNombre: this.pickName(e),
          t1: null,
          t2: null,
          t3: null,
          final: null,
        })
      )
      .sort((a: RowVM, b: RowVM) => a.estudianteNombre.localeCompare(b.estudianteNombre));

    if (!base.length) {
      this.rows.set([]);
      return;
    }

    const cursoId = this.asId(this.cursoDetalle()?._id);
    const anioId = this.anioLectivoId();
    const materiaId = this.materiaId || mats[0]?.materiaId || '';

    if (!cursoId || !anioId || !materiaId) {
      this.rows.set(base);
      this.sb.open('IDs incompletos (curso/año/materia).', 'Cerrar', { duration: 2500 });
      return;
    }

    this.cargando.set(true);

    const loadTrim = (tri: Trimestre) =>
      new Promise<Map<string, number | null>>((resolve) => {
        this.caliSrv
          .obtenerNotas({ cursoId, anioLectivoId: anioId, materiaId, trimestre: tri })
          .subscribe({
            next: (res) => {
              const arr: any[] = res?.estudiantes ?? [];         

              const idx = new Map<string, number | null>();
              for (const it of arr) {
                // acepta estudianteId directo o estudiante anidado
                const sid = this.pickId((it as any)?.estudianteId ?? (it as any)?.estudiante);
                const nota = this.notaFrom(it);
                if (sid) idx.set(sid, nota);
              }
              resolve(idx);
            },
            error: (e) => {
              console.error(`[ResumenNotas] Error cargando ${tri}:`, e);
              resolve(new Map());
            },
          });
      });

    Promise.all([loadTrim('T1'), loadTrim('T2'), loadTrim('T3')])
      .then(([m1, m2, m3]) => {
        const merged = base.map((r: RowVM): RowVM => {
          const sid = r.estudianteId; // ya normalizado con pickId

          const t1 = m1.get(sid) ?? null;
          const t2 = m2.get(sid) ?? null;
          const t3 = m3.get(sid) ?? null;

          const final =
            t1 != null && t2 != null && t3 != null ? Number(((t1 + t2 + t3) / 3).toFixed(2)) : null;

          if (t1 != null || t2 != null || t3 != null) {
          } else {
          }

          return { ...r, t1, t2, t3, final };
        });

        this.rows.set(merged);
        this.cargando.set(false);
      })
      .catch((e) => {
        this.rows.set(base);
        this.cargando.set(false);
      });
  }

  // ===== Helpers UI =====
  fmt(n: number | null): string {
    return n == null ? '—' : n.toFixed(2);
  }
  isOK(n: number | null): boolean {
    return n != null && n >= 7;
  }
  isBad(n: number | null): boolean {
    return n != null && n < 7;
  }

  // ===== Helper genérico =====
  asId(val: any): string {
    if (!val) return '';
    if (typeof val === 'string') return val;
    if (typeof val === 'object' && (val as any)._id) return String((val as any)._id);
    return String(val);
  }
}

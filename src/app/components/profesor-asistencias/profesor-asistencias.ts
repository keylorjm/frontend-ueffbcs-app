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
import { AsistenciaService, Trimestre } from '../../services/asistencia.service';

type MateriaAsignada = { materiaId: string; materiaNombre: string };

type RowVM = {
  estudianteId: string;
  estudianteNombre: string;
  faltasJustificadas: number;
  faltasInjustificadas: number;
  diasLaborados: number;        // editable por fila si lo deseas (dejamos visible)
  asistidos: number;            // derivado = diasLaborados - faltasInjustificadas
};

@Component({
  standalone: true,
  selector: 'app-profesor-asistencias-curso',
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatSelectModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatSnackBarModule,
    MatIconModule, MatDividerModule, MatTableModule, MatProgressBarModule, MatTooltipModule, MatChipsModule
  ],
  template: `
  <div class="wrap">
    <mat-card class="card">
      <!-- Header -->
      <div class="header">
        <div class="title-block">
          <div class="eyebrow"><mat-icon>event_busy</mat-icon> Registro de asistencias</div>
          <h2 class="title">Faltas por Curso (Trimestrales)</h2>
          <p class="sub">Ingrese <b>faltas justificadas</b> e <b>injustificadas</b>. Defina los <b>días laborados</b> del trimestre.</p>
        </div>
        <div class="actions">
          <button mat-stroked-button class="btn-outline" (click)="recargar()" matTooltip="Volver a cargar datos del curso">
            <mat-icon>refresh</mat-icon>
            <span>Recargar</span>
          </button>
          <button mat-flat-button color="primary" class="btn-primary" (click)="guardar()" [disabled]="guardando() || !rows().length">
            <mat-icon>save</mat-icon>
            <span>{{ guardando() ? 'Guardando...' : 'Guardar' }}</span>
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

        <div class="dl-panel">
          <div class="chipline">
            <mat-chip-set>
              <mat-chip appearance="outlined" color="primary">Trimestre: {{ trimestre }}</mat-chip>
              <mat-chip appearance="outlined">Estudiantes: {{ rows().length }}</mat-chip>
            </mat-chip-set>
          </div>
          <div class="dl-fields">
            <mat-form-field appearance="outline" class="ff small dense">
              <mat-label>Días laborados (global)</mat-label>
              <input matInput type="number" min="0" [(ngModel)]="diasLaboradosGlobal" (ngModelChange)="aplicarDiasLaboradosGlobal(false)" />
            </mat-form-field>
            <button mat-stroked-button (click)="aplicarDiasLaboradosGlobal(true)" matTooltip="Aplicar el valor global a todas las filas">
              <mat-icon>done_all</mat-icon> Aplicar a todos
            </button>
          </div>
        </div>
      </div>

      <mat-progress-bar *ngIf="cargando()" mode="indeterminate"></mat-progress-bar>

      <!-- Tabla -->
      <div class="table-wrap" *ngIf="rows().length; else noRows">
        <table mat-table [dataSource]="rows()" class="modern-table compact mat-elevation-z1" aria-label="Tabla de asistencias">
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
                <div class="avatar" aria-hidden="true">{{ r.estudianteNombre?.[0] || 'E' }}</div>
                <div class="student-name" [matTooltip]="r.estudianteNombre">{{ r.estudianteNombre }}</div>
              </div>
            </td>
          </ng-container>

          <!-- Faltas Justificadas -->
          <ng-container matColumnDef="fj">
            <th mat-header-cell *matHeaderCellDef class="sticky center">Faltas J.</th>
            <td mat-cell *matCellDef="let r" class="center">
              <input class="inp" type="number" min="0" [(ngModel)]="r.faltasJustificadas" (ngModelChange)="recalcRow(r)" />
            </td>
          </ng-container>

          <!-- Faltas Injustificadas -->
          <ng-container matColumnDef="fi">
            <th mat-header-cell *matHeaderCellDef class="sticky center">Faltas I.</th>
            <td mat-cell *matCellDef="let r" class="center">
              <input class="inp" type="number" min="0" [(ngModel)]="r.faltasInjustificadas" (ngModelChange)="recalcRow(r)" />
            </td>
          </ng-container>

          <!-- Días laborados (por fila, opcionalmente editable) -->
          <ng-container matColumnDef="dl">
            <th mat-header-cell *matHeaderCellDef class="sticky center">Laborados</th>
            <td mat-cell *matCellDef="let r" class="center">
              <input class="inp" type="number" min="0" [(ngModel)]="r.diasLaborados" (ngModelChange)="recalcRow(r)" />
            </td>
          </ng-container>

          <!-- Asistidos (derivado) -->
          <ng-container matColumnDef="asis">
            <th mat-header-cell *matHeaderCellDef class="sticky center">Asistidos</th>
            <td mat-cell *matCellDef="let r" class="center">
              <span class="badge">{{ r.asistidos }}</span>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="cols"></tr>
          <tr mat-row *matRowDef="let row; columns: cols" class="row"></tr>
        </table>

        <div class="footer-actions">
          <button mat-stroked-button class="btn-outline" (click)="recargar()">
            <mat-icon>refresh</mat-icon>
            Recargar
          </button>
          <button mat-flat-button color="primary" class="btn-primary" (click)="guardar()" [disabled]="guardando() || !rows().length">
            <mat-icon>save</mat-icon>
            {{ guardando() ? 'Guardando...' : 'Guardar' }}
          </button>
        </div>
      </div>

      <ng-template #noRows>
        <div class="empty">
          <div class="empty-icon">🗂️</div>
          <div class="empty-title">No hay estudiantes cargados</div>
          <div class="empty-sub">Seleccione <b>Curso</b>, (si aplica) <b>Materia</b> y <b>Trimestre</b> para visualizar la tabla.</div>
          <button mat-stroked-button class="btn-outline mt-8" (click)="recargar()">
            <mat-icon>refresh</mat-icon>
            Intentar de nuevo
          </button>
        </div>
      </ng-template>
    </mat-card>
  </div>
  `,
  styles: [`
    .wrap { padding: 16px; max-width: 1100px; margin: 0 auto; }
    .card { padding: 16px; border-radius: 16px; display: grid; gap: 12px; }

    .header { display: grid; grid-template-columns: 1fr auto; gap: 10px; align-items: center; }
    .title-block .eyebrow { display: inline-flex; gap: 6px; align-items: center; font-size: 12px; letter-spacing: .3px; opacity: .8; }
    .title { margin: 0; font-size: 20px; font-weight: 700; }
    .sub { margin: 0; opacity: .8; font-size: 12.5px; }
    .actions { display: inline-flex; gap: 8px; align-items: center; }
    .btn-primary mat-icon, .btn-outline mat-icon { margin-right: 6px; }
    .soft-divider { opacity: .45; }

    .filters { display: grid; grid-template-columns: repeat(3, minmax(210px, 1fr)); gap: 10px; align-items: end; }
    .ff { width: 100%; }
    .dense .mat-mdc-form-field-infix { padding-top: 6px !important; padding-bottom: 6px !important; }
    .dense .mat-mdc-text-field-wrapper { --mdc-filled-text-field-container-height: 36px; }

    .dl-panel { grid-column: 1 / -1; border: 1px solid #eee; border-radius: 12px; padding: 10px; background: #fafafa; display: grid; gap: 8px; }
    .chipline { display: flex; justify-content: space-between; align-items: center; }
    .dl-fields { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
    .small { max-width: 220px; }

    .table-wrap { margin-top: 4px; overflow: auto; border-radius: 12px; border: 1px solid #EAEAEA; }
    table { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 13px; }
    .modern-table th { background: #F9FAFB; font-weight: 600; color: #2f2f2f; }
    .modern-table th, .modern-table td { padding: 6px 10px; }
    .modern-table.compact .row { height: 36px; }
    .modern-table .sticky { position: sticky; top: 0; z-index: 1; }
    .modern-table .row:nth-child(odd) td { background: #FFFFFF; }
    .modern-table .row:nth-child(even) td { background: #FBFBFD; }
    .center { text-align: center; }

    .muted { opacity: .7; }
    .student-cell { display: flex; align-items: center; gap: 8px; min-width: 200px; }
    .avatar { width: 24px; height: 24px; border-radius: 50%; display: grid; place-items: center; background: #EEF2FF; font-weight: 700; font-size: 11px; }
    .student-name { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

    .inp { width: 110px; padding: 6px; border: 1px solid #ddd; border-radius: 8px; }
    .badge { padding: 2px 8px; border-radius: 999px; font-size: 12px; background: #eee; }

    .footer-actions { display: flex; justify-content: flex-end; gap: 8px; padding: 10px; border-top: 1px solid #EEE; background: #FFF; }

    .empty { padding: 28px 14px; display: grid; place-items: center; text-align: center; gap: 6px; color: #555; }
    .empty-icon { font-size: 40px; }
    .empty-title { font-weight: 700; }
    .mt-8 { margin-top: 8px; }

    @media (max-width: 1000px) { .filters { grid-template-columns: repeat(2, minmax(210px, 1fr)); } }
    @media (max-width: 700px) { .filters { grid-template-columns: 1fr; } .student-cell { min-width: 160px; } }
  `]
})
export class ProfesorAsistencias implements OnInit {
  private sb = inject(MatSnackBar);
  private auth = inject(AuthService);
  private cursoSrv = inject(CursoService);
  private asistSrv = inject(AsistenciaService);

  // Estado base
  cursos = signal<any[]>([]);
  cargando = signal<boolean>(false);
  guardando = signal<boolean>(false);

  // Selección
  cursoId = '';
  materiaId = '';
  trimestre: Trimestre = 'T1';

  // Detalle del curso
  cursoDetalle = signal<any | null>(null);

  // Tabla
  cols = ['n','est','fj','fi','dl','asis'];
  rows = signal<RowVM[]>([]);

  // Días laborados (global del trimestre para este curso+materia)
  diasLaboradosGlobal = 0;

  ngOnInit(): void {
    // Cargar cursos del profesor (solo donde es responsable de alguna materia)
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

  // Derivados
  cursoSel = computed(() => (this.cursos() ?? []).find(c => this.asId(c._id) === this.cursoId));
  anioLectivoId = computed(() => this.asId(this.cursoDetalle()?.anioLectivo || this.cursoSel()?.anioLectivo));

  materiasAsignadas = computed<MateriaAsignada[]>(() => {
    const me = this.auth.getuser()?.id ?? '';
    const mats = (this.cursoDetalle()?.materias ?? this.cursoSel()?.materias ?? [])
      .filter((m: any) => this.asId(m?.profesor) === me)
      .map((m: any) => ({
        materiaId: this.asId(m?.materia),
        materiaNombre: m?.materia?.nombre ?? m?.materia ?? '—'
      }));
    return mats;
  });

  // Handlers
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
        // Autoseleccionar materia si solo tiene una asignada
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

  cargarTabla(): void {
    this.rows.set([]);
    this.diasLaboradosGlobal = 0;

    if (!this.cursoDetalle() || !this.trimestre) return;
    if (this.materiasAsignadas().length > 1 && !this.materiaId) return;

    // base con estudiantes
    const estudiantes = this.cursoDetalle()?.estudiantes ?? [];
    const base: RowVM[] = (estudiantes ?? []).map((e: any) => ({
      estudianteId: this.asId(e),
      estudianteNombre: e?.nombre ?? e?.fullname ?? e?.email ?? '—',
      faltasJustificadas: 0,
      faltasInjustificadas: 0,
      diasLaborados: 0,
      asistidos: 0,
    })).sort((a: { estudianteNombre: string; }, b: { estudianteNombre: any; }) => a.estudianteNombre.localeCompare(b.estudianteNombre));

    if (!base.length) { this.rows.set([]); return; }

    // Prefill desde backend
    this.cargando.set(true);
    this.asistSrv.obtenerAsistencias({
      cursoId: this.asId(this.cursoDetalle()?._id),
      anioLectivoId: this.anioLectivoId(),
      materiaId: this.materiaId || this.materiasAsignadas()[0]?.materiaId || '',
      trimestre: this.trimestre,
    }).subscribe({
      next: (res) => {
        const idx = new Map<string, any>();
        (res?.estudiantes ?? []).forEach((it: any) => idx.set(it.estudianteId, it));
        let dlGlobalDetect = 0;

        const merged = base.map(r => {
          const prev = idx.get(r.estudianteId);
          const fj = Number(prev?.faltasJustificadas ?? 0);
          const fi = Number(prev?.faltasInjustificadas ?? 0);
          const dl = Number(prev?.diasLaborados ?? 0);
          dlGlobalDetect = Math.max(dlGlobalDetect, dl); // heurística simple para prellenar el global

          return {
            ...r,
            faltasJustificadas: fj,
            faltasInjustificadas: fi,
            diasLaborados: dl,
            asistidos: Math.max(0, dl - fi),
          };
        });

        this.rows.set(merged);
        this.diasLaboradosGlobal = dlGlobalDetect; // sugerimos el mayor detectado como “global”
        this.cargando.set(false);
      },
      error: () => { this.rows.set(base); this.cargando.set(false); }
    });
  }

  aplicarDiasLaboradosGlobal(aplicarATodos: boolean) {
    const dl = Math.max(0, Number(this.diasLaboradosGlobal || 0));
    if (!aplicarATodos) return; // solo si presiona el botón
    this.rows.update(rows => rows.map(r => ({
      ...r,
      diasLaborados: dl,
      asistidos: Math.max(0, dl - Number(r.faltasInjustificadas || 0)),
    })));
  }

  recalcRow(r: RowVM) {
    const fi = Math.max(0, Number(r.faltasInjustificadas || 0));
    const dl = Math.max(0, Number(r.diasLaborados || 0));
    r.faltasJustificadas = Math.max(0, Number(r.faltasJustificadas || 0));
    r.faltasInjustificadas = fi;
    r.diasLaborados = dl;
    r.asistidos = Math.max(0, dl - fi);
  }

  guardar(): void {
    const anioId = this.anioLectivoId();
    const materia = this.materiaId || this.materiasAsignadas()[0]?.materiaId || '';

    if (!this.cursoId || !anioId || !materia || !this.trimestre) {
      this.sb.open('Faltan datos: curso, materia o trimestre', 'Cerrar', { duration: 3000 });
      return;
    }
    if (!this.rows().length) {
      this.sb.open('No hay estudiantes para guardar', 'Cerrar', { duration: 2500 });
      return;
    }

    // Validaciones básicas
    const invalid = this.rows().some(r =>
      Number(r.faltasJustificadas ?? 0) < 0 ||
      Number(r.faltasInjustificadas ?? 0) < 0 ||
      Number(r.diasLaborados ?? 0) < 0
    );
    if (invalid) {
      this.sb.open('Los valores no pueden ser negativos.', 'Cerrar', { duration: 3000 });
      return;
    }

    // Construir payload
    const tableRows = this.rows().map(r => ({
      estudianteId: r.estudianteId,
      faltasJustificadas: Number(r.faltasJustificadas ?? 0),
      faltasInjustificadas: Number(r.faltasInjustificadas ?? 0),
      diasLaborados: Number(r.diasLaborados ?? 0),
    }));

    const payload = this.asistSrv.buildBulkPayload({
      cursoId: this.cursoId,
      anioLectivoId: anioId,
      materiaId: materia,
      trimestre: this.trimestre,
      tableRows
    });

    this.guardando.set(true);
    this.asistSrv.cargarAsistenciaBulk(payload).subscribe({
      next: (r) => { this.guardando.set(false); this.sb.open(r?.message ?? 'Asistencias guardadas', 'Cerrar', { duration: 2500 }); this.cargarTabla(); },
      error: (e) => { this.guardando.set(false); this.sb.open(e?.error?.message ?? 'Error al guardar', 'Cerrar', { duration: 3500 }); }
    });
  }

  // Helpers (público porque lo usa el template)
  asId(val: any): string {
    if (!val) return '';
    if (typeof val === 'string') return val;
    if (typeof val === 'object' && val._id) return String(val._id);
    return String(val);
  }
}
